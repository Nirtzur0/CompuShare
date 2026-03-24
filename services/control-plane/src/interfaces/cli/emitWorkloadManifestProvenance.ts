import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadWorkloadManifestProvenanceSettings } from "../../config/WorkloadManifestProvenanceSettings.js";
import { GenerateWorkloadManifestProvenanceUseCase } from "../../application/workload/GenerateWorkloadManifestProvenanceUseCase.js";
import { loadControlPlaneProductDefaults } from "../../config/ControlPlaneProductDefaults.js";
import { HmacWorkloadManifestSignatureService } from "../../infrastructure/security/HmacWorkloadManifestSignatureService.js";

export interface EmitWorkloadManifestProvenanceOptions {
  readonly argv?: readonly string[];
  readonly cwd?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly clock?: () => Date;
}

export interface EmitWorkloadManifestProvenanceResult {
  outputPath: string;
  recordCount: number;
}

export async function emitWorkloadManifestProvenance(
  options: EmitWorkloadManifestProvenanceOptions = {}
): Promise<EmitWorkloadManifestProvenanceResult> {
  const argv = options.argv ?? process.argv.slice(2);
  const cwd = options.cwd ?? process.cwd();
  const outputPath = resolve(cwd, parseOutputPath(argv));
  const settings = loadWorkloadManifestProvenanceSettings(
    options.environment ?? process.env
  );
  const productDefaults = loadControlPlaneProductDefaults();
  const useCase = new GenerateWorkloadManifestProvenanceUseCase(
    productDefaults.approvedChatModelCatalog,
    new HmacWorkloadManifestSignatureService(
      settings.workloadManifestSigningKey,
      settings.workloadManifestSigningKeyId,
      settings.workloadManifestSigningIdentity
    ),
    options.clock
  );
  const report = useCase.execute();

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(report.toSnapshot(), null, 2)}\n`,
    "utf8"
  );

  return {
    outputPath,
    recordCount: report.manifests.length
  };
}

function parseOutputPath(argv: readonly string[]): string {
  const outputIndex = argv.findIndex((argument) => argument === "--output");

  if (outputIndex === -1) {
    return "artifacts/workload-manifest-provenance.json";
  }

  const outputPath = argv[outputIndex + 1];

  if (outputPath === undefined || outputPath.trim().length === 0) {
    throw new Error("The --output flag requires a filesystem path.");
  }

  return outputPath;
}

async function main(): Promise<void> {
  const result = await emitWorkloadManifestProvenance();

  process.stdout.write(
    `Emitted ${String(result.recordCount)} signed workload manifest provenance records to ${result.outputPath}\n`
  );
}

const entrypointPath = process.argv[1];

if (entrypointPath !== undefined && import.meta.url.endsWith(entrypointPath)) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown error"}\n`
    );
    process.exitCode = 1;
  });
}
