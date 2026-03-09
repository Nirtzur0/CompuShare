import "dotenv/config";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { SeedRunnableAlphaDemo } from "../../application/demo/SeedRunnableAlphaDemo.js";
import { GetConsumerDashboardOverviewUseCase } from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../application/ledger/RecordCustomerChargeUseCase.js";
import { RecordGatewayUsageMeterEventUseCase } from "../../application/metering/RecordGatewayUsageMeterEventUseCase.js";
import { CreateOrganizationUseCase } from "../../application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../application/identity/IssueOrganizationApiKeyUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../application/placement/ResolveSyncPlacementUseCase.js";
import { EnrollProviderNodeUseCase } from "../../application/provider/EnrollProviderNodeUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { loadDemoSeedSettings } from "../../config/DemoSeedSettings.js";
import { StructuredConsoleAuditLog } from "../../infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../infrastructure/persistence/postgres/PostgresIdentityRepository.js";

export interface SeedRunnableAlphaDemoCliOptions {
  environment?: NodeJS.ProcessEnv;
  seedTag?: string;
  clock?: () => Date;
}

export function formatSeedRunnableAlphaDemoSummary(
  result: Awaited<ReturnType<typeof seedRunnableAlphaDemoCli>>
): string {
  return [
    "Seeded runnable alpha demo data.",
    `Buyer dashboard: ${result.buyer.dashboardUrl}`,
    `Provider dashboard: ${result.provider.dashboardUrl}`,
    `Gateway demo: ${result.gatewayDemo.curlCommand}`,
    `Buyer API key: ${result.buyer.apiKey.secret}`,
    `Provider API key: ${result.provider.apiKey.secret}`,
    `Provider node: ${result.provider.node.id}`,
    `Provider runtime endpoint: ${result.provider.routingProfile.endpointUrl}`
  ].join("\n");
}

export async function seedRunnableAlphaDemoCli(
  options: SeedRunnableAlphaDemoCliOptions = {}
): Promise<{
  seedTag: string;
  seededAt: string;
  controlPlaneBaseUrl: string;
  providerRuntimeBaseUrl: string;
  dashboardBaseUrl: string;
  gatewayDemo: Awaited<
    ReturnType<SeedRunnableAlphaDemo["execute"]>
  >["gatewayDemo"];
  buyer: Awaited<ReturnType<SeedRunnableAlphaDemo["execute"]>>["buyer"];
  provider: Awaited<ReturnType<SeedRunnableAlphaDemo["execute"]>>["provider"];
}> {
  const settings = loadDemoSeedSettings(options.environment ?? process.env);
  const pool = new Pool({ connectionString: settings.databaseUrl });

  try {
    const schemaInitializer = new IdentitySchemaInitializer(pool);
    await schemaInitializer.ensureSchema();

    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    let apiKeySequence = 0;
    const useCase = new SeedRunnableAlphaDemo(
      new CreateOrganizationUseCase(repository, auditLog, options.clock),
      new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        options.clock,
        () =>
          apiKeySequence++ === 1
            ? settings.providerRuntimeApiKey
            : `csk_demo_${String(apiKeySequence - 1).padStart(6, "0")}_${randomBytes(18).toString("base64url")}`
      ),
      new EnrollProviderNodeUseCase(repository, auditLog, options.clock),
      new RecordProviderBenchmarkUseCase(repository, auditLog, options.clock),
      new UpsertProviderNodeRoutingProfileUseCase(
        repository,
        auditLog,
        options.clock
      ),
      new RecordCustomerChargeUseCase(repository, auditLog, options.clock),
      new RecordCompletedJobSettlementUseCase(
        repository,
        auditLog,
        options.clock
      ),
      new ResolveSyncPlacementUseCase(repository, auditLog, options.clock),
      new RecordGatewayUsageMeterEventUseCase(
        repository,
        auditLog,
        options.clock
      ),
      new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      new GetProviderDashboardOverviewUseCase(repository, auditLog),
      options.clock
    );

    return await useCase.execute({
      controlPlaneBaseUrl: settings.controlPlaneBaseUrl,
      providerRuntimeBaseUrl: settings.providerRuntimeBaseUrl,
      dashboardBaseUrl: settings.dashboardBaseUrl,
      ...(options.seedTag === undefined ? {} : { seedTag: options.seedTag })
    });
  } finally {
    await pool.end();
  }
}

export async function main(): Promise<void> {
  const result = await seedRunnableAlphaDemoCli();

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stderr.write(`${formatSeedRunnableAlphaDemoSummary(result)}\n`);
}

export function isDirectExecution(
  moduleUrl: string,
  entrypointPath: string | undefined
): boolean {
  return entrypointPath !== undefined && moduleUrl.endsWith(entrypointPath);
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown error"}\n`
    );
    process.exitCode = 1;
  });
}
