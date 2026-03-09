import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emitWorkloadManifestProvenance } from "../../../src/interfaces/cli/emitWorkloadManifestProvenance.js";

describe("emitWorkloadManifestProvenance", () => {
  it("writes the signed provenance artifact to the requested output path", async () => {
    const fixtureDirectory = await mkdtemp(
      join(tmpdir(), "compushare-workload-provenance-")
    );
    const outputPath = join(fixtureDirectory, "release", "provenance.json");

    const result = await emitWorkloadManifestProvenance({
      argv: ["--output", outputPath],
      cwd: fixtureDirectory,
      environment: {
        WORKLOAD_MANIFEST_SIGNING_KEY:
          "local-workload-manifest-signing-secret-1234567890",
        WORKLOAD_MANIFEST_SIGNING_KEY_ID: "ci-hmac-v1",
        WORKLOAD_MANIFEST_SIGNING_IDENTITY: "github-actions[bot]"
      },
      clock: () => new Date("2026-03-09T21:20:00.000Z")
    });

    const artifact = JSON.parse(await readFile(outputPath, "utf8")) as {
      generatedAt: string;
      recordCount: number;
      manifests: {
        signatureKeyId: string;
        signingIdentity: string;
        manifest: { providerRuntime: string };
      }[];
    };

    expect(result).toEqual({
      outputPath,
      recordCount: 2
    });
    expect(artifact).toMatchObject({
      generatedAt: "2026-03-09T21:20:00.000Z",
      recordCount: 2,
      manifests: [
        {
          signatureKeyId: "ci-hmac-v1",
          signingIdentity: "github-actions[bot]",
          manifest: { providerRuntime: "kubernetes" }
        },
        {
          signatureKeyId: "ci-hmac-v1",
          signingIdentity: "github-actions[bot]",
          manifest: { providerRuntime: "linux" }
        }
      ]
    });
  });

  it("uses the default artifact location when no output path is provided", async () => {
    const fixtureDirectory = await mkdtemp(
      join(tmpdir(), "compushare-workload-provenance-default-")
    );
    const defaultOutputPath = join(
      fixtureDirectory,
      "artifacts",
      "workload-manifest-provenance.json"
    );

    const result = await emitWorkloadManifestProvenance({
      cwd: fixtureDirectory,
      environment: {
        WORKLOAD_MANIFEST_SIGNING_KEY:
          "local-workload-manifest-signing-secret-1234567890",
        WORKLOAD_MANIFEST_SIGNING_KEY_ID: "ci-hmac-v1",
        WORKLOAD_MANIFEST_SIGNING_IDENTITY: "github-actions[bot]"
      },
      clock: () => new Date("2026-03-09T21:25:00.000Z")
    });

    const artifact = JSON.parse(await readFile(defaultOutputPath, "utf8")) as {
      generatedAt: string;
    };

    expect(result.outputPath).toBe(defaultOutputPath);
    expect(artifact.generatedAt).toBe("2026-03-09T21:25:00.000Z");
  });

  it("rejects an empty output argument", async () => {
    await expect(
      emitWorkloadManifestProvenance({
        argv: ["--output", ""],
        environment: {
          WORKLOAD_MANIFEST_SIGNING_KEY:
            "local-workload-manifest-signing-secret-1234567890",
          WORKLOAD_MANIFEST_SIGNING_KEY_ID: "ci-hmac-v1",
          WORKLOAD_MANIFEST_SIGNING_IDENTITY: "github-actions[bot]"
        }
      })
    ).rejects.toThrow("The --output flag requires a filesystem path.");
  });
});
