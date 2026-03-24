import "dotenv/config";
import { Pool } from "pg";
import { RunGatewayBatchWorkerCycleUseCase } from "../../application/batch/RunGatewayBatchWorkerCycleUseCase.js";
import { AuthenticateGatewayApiKeyUseCase } from "../../application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { ExecuteChatCompletionUseCase } from "../../application/gateway/ExecuteChatCompletionUseCase.js";
import { ExecuteEmbeddingUseCase } from "../../application/gateway/ExecuteEmbeddingUseCase.js";
import { GatewayUsageAdmissionUseCase } from "../../application/gateway/GatewayUsageAdmissionUseCase.js";
import { RecordGatewayUsageMeterEventUseCase } from "../../application/metering/RecordGatewayUsageMeterEventUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../application/placement/ResolveSyncPlacementUseCase.js";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { PrepareSignedEmbeddingWorkloadBundleUseCase } from "../../application/workload/PrepareSignedEmbeddingWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { loadControlPlaneProductDefaults } from "../../config/ControlPlaneProductDefaults.js";
import { GatewayTrafficPolicy } from "../../config/GatewayTrafficPolicy.js";
import { loadControlPlaneSettings } from "../../config/ControlPlaneSettings.js";
import { FetchGatewayUpstreamClient } from "../../infrastructure/gateway/FetchGatewayUpstreamClient.js";
import { StructuredConsoleAuditLog } from "../../infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { HmacWorkloadBundleSignatureService } from "../../infrastructure/security/HmacWorkloadBundleSignatureService.js";

export async function startBatchWorker(): Promise<void> {
  const settings = loadControlPlaneSettings(process.env);
  const pool = new Pool({ connectionString: settings.databaseUrl });
  const schemaInitializer = new IdentitySchemaInitializer(pool);
  await schemaInitializer.ensureSchema();

  const repository = new PostgresIdentityRepository(pool);
  const auditLog = new StructuredConsoleAuditLog();
  const gatewayTrafficPolicy = GatewayTrafficPolicy.load(process.env);
  const productDefaults = loadControlPlaneProductDefaults();
  const approvedChatModelCatalog = productDefaults.approvedChatModelCatalog;
  const approvedEmbeddingModelCatalog =
    productDefaults.approvedEmbeddingModelCatalog;
  const authenticateGatewayApiKeyUseCase = new AuthenticateGatewayApiKeyUseCase(
    repository,
    auditLog
  );
  const resolveSyncPlacementUseCase = new ResolveSyncPlacementUseCase(
    repository,
    auditLog
  );
  const workloadBundleSignatureService = new HmacWorkloadBundleSignatureService(
    settings.workloadBundleSigningKey,
    settings.workloadBundleSigningKeyId
  );
  const verifySignedWorkloadBundleAdmissionUseCase =
    new VerifySignedWorkloadBundleAdmissionUseCase(
      workloadBundleSignatureService,
      approvedChatModelCatalog,
      auditLog,
      () => new Date(),
      approvedEmbeddingModelCatalog
    );
  const gatewayUsageMeterEventUseCase = new RecordGatewayUsageMeterEventUseCase(
    repository,
    auditLog
  );
  const gatewayUsageAdmissionUseCase = new GatewayUsageAdmissionUseCase(
    repository,
    auditLog,
    gatewayTrafficPolicy
  );
  const executeChatCompletionUseCase = new ExecuteChatCompletionUseCase(
    authenticateGatewayApiKeyUseCase,
    approvedChatModelCatalog,
    resolveSyncPlacementUseCase,
    new PrepareSignedChatWorkloadBundleUseCase(
      workloadBundleSignatureService,
      verifySignedWorkloadBundleAdmissionUseCase
    ),
    new FetchGatewayUpstreamClient(),
    gatewayUsageMeterEventUseCase,
    auditLog,
    gatewayUsageAdmissionUseCase
  );
  const executeEmbeddingUseCase = new ExecuteEmbeddingUseCase(
    authenticateGatewayApiKeyUseCase,
    approvedEmbeddingModelCatalog,
    resolveSyncPlacementUseCase,
    new PrepareSignedEmbeddingWorkloadBundleUseCase(
      workloadBundleSignatureService,
      verifySignedWorkloadBundleAdmissionUseCase
    ),
    new FetchGatewayUpstreamClient(),
    gatewayUsageMeterEventUseCase,
    auditLog,
    gatewayUsageAdmissionUseCase
  );
  const worker = new RunGatewayBatchWorkerCycleUseCase(
    repository,
    executeChatCompletionUseCase,
    executeEmbeddingUseCase,
    auditLog
  );

  try {
    for (;;) {
      const result = await worker.execute();
      if (result.processedBatchId === null) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } finally {
    await pool.end();
  }
}

export function isDirectExecution(
  moduleUrl: string,
  entrypointPath: string | undefined
): boolean {
  return entrypointPath !== undefined && moduleUrl.endsWith(entrypointPath);
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  startBatchWorker().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown error"}\n`
    );
    process.exitCode = 1;
  });
}
