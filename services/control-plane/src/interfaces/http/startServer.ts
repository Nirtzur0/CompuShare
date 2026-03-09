import "dotenv/config";
import { Pool } from "pg";
import { GetConsumerDashboardOverviewUseCase } from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { GetOrganizationWalletSummaryUseCase } from "../../application/ledger/GetOrganizationWalletSummaryUseCase.js";
import { GetStagedPayoutExportUseCase } from "../../application/ledger/GetStagedPayoutExportUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../application/ledger/RecordCustomerChargeUseCase.js";
import { AuthenticateOrganizationApiKeyUseCase } from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { AuthenticateGatewayApiKeyUseCase } from "../../application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { AcceptOrganizationInvitationUseCase } from "../../application/identity/AcceptOrganizationInvitationUseCase.js";
import { CreateOrganizationUseCase } from "../../application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../application/identity/IssueOrganizationApiKeyUseCase.js";
import { IssueOrganizationInvitationUseCase } from "../../application/identity/IssueOrganizationInvitationUseCase.js";
import { UpdateOrganizationMemberRoleUseCase } from "../../application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { ExecuteChatCompletionUseCase } from "../../application/gateway/ExecuteChatCompletionUseCase.js";
import { RecordGatewayUsageMeterEventUseCase } from "../../application/metering/RecordGatewayUsageMeterEventUseCase.js";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { ListPlacementCandidatesUseCase } from "../../application/placement/ListPlacementCandidatesUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../application/placement/ResolveSyncPlacementUseCase.js";
import { AdmitProviderRuntimeWorkloadBundleUseCase } from "../../application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import { FetchGatewayUpstreamClient } from "../../infrastructure/gateway/FetchGatewayUpstreamClient.js";
import { InMemoryApprovedChatModelCatalog } from "../../infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { EnrollProviderNodeUseCase } from "../../application/provider/EnrollProviderNodeUseCase.js";
import { GetProviderNodeDetailUseCase } from "../../application/provider/GetProviderNodeDetailUseCase.js";
import { ListProviderBenchmarkHistoryUseCase } from "../../application/provider/ListProviderBenchmarkHistoryUseCase.js";
import { ListProviderInventoryUseCase } from "../../application/provider/ListProviderInventoryUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { loadControlPlaneSettings } from "../../config/ControlPlaneSettings.js";
import { StructuredConsoleAuditLog } from "../../infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { HmacWorkloadBundleSignatureService } from "../../infrastructure/security/HmacWorkloadBundleSignatureService.js";
import { buildApp } from "./buildApp.js";

async function startServer(): Promise<void> {
  const settings = loadControlPlaneSettings(process.env);
  const pool = new Pool({ connectionString: settings.databaseUrl });
  const schemaInitializer = new IdentitySchemaInitializer(pool);
  await schemaInitializer.ensureSchema();

  const repository = new PostgresIdentityRepository(pool);
  const auditLog = new StructuredConsoleAuditLog();
  const createOrganizationUseCase = new CreateOrganizationUseCase(
    repository,
    auditLog
  );
  const issueOrganizationInvitationUseCase =
    new IssueOrganizationInvitationUseCase(repository, auditLog);
  const acceptOrganizationInvitationUseCase =
    new AcceptOrganizationInvitationUseCase(repository, auditLog);
  const updateOrganizationMemberRoleUseCase =
    new UpdateOrganizationMemberRoleUseCase(repository, auditLog);
  const issueOrganizationApiKeyUseCase = new IssueOrganizationApiKeyUseCase(
    repository,
    repository,
    auditLog
  );
  const authenticateOrganizationApiKeyUseCase =
    new AuthenticateOrganizationApiKeyUseCase(repository, auditLog);
  const authenticateGatewayApiKeyUseCase = new AuthenticateGatewayApiKeyUseCase(
    repository,
    auditLog
  );
  const recordCustomerChargeUseCase = new RecordCustomerChargeUseCase(
    repository,
    auditLog
  );
  const recordCompletedJobSettlementUseCase =
    new RecordCompletedJobSettlementUseCase(repository, auditLog);
  const getStagedPayoutExportUseCase = new GetStagedPayoutExportUseCase(
    repository
  );
  const getOrganizationWalletSummaryUseCase =
    new GetOrganizationWalletSummaryUseCase(repository);
  const getConsumerDashboardOverviewUseCase =
    new GetConsumerDashboardOverviewUseCase(repository, auditLog);
  const getProviderDashboardOverviewUseCase =
    new GetProviderDashboardOverviewUseCase(repository, auditLog);
  const listPlacementCandidatesUseCase = new ListPlacementCandidatesUseCase(
    repository
  );
  const resolveSyncPlacementUseCase = new ResolveSyncPlacementUseCase(
    repository,
    auditLog
  );
  const approvedChatModelCatalog =
    InMemoryApprovedChatModelCatalog.createDefault();
  const workloadBundleSignatureService = new HmacWorkloadBundleSignatureService(
    settings.workloadBundleSigningKey,
    settings.workloadBundleSigningKeyId
  );
  const verifySignedWorkloadBundleAdmissionUseCase =
    new VerifySignedWorkloadBundleAdmissionUseCase(
      workloadBundleSignatureService,
      approvedChatModelCatalog,
      auditLog
    );
  const prepareSignedChatWorkloadBundleUseCase =
    new PrepareSignedChatWorkloadBundleUseCase(
      workloadBundleSignatureService,
      verifySignedWorkloadBundleAdmissionUseCase
    );
  const executeChatCompletionUseCase = new ExecuteChatCompletionUseCase(
    authenticateGatewayApiKeyUseCase,
    approvedChatModelCatalog,
    resolveSyncPlacementUseCase,
    prepareSignedChatWorkloadBundleUseCase,
    new FetchGatewayUpstreamClient(),
    new RecordGatewayUsageMeterEventUseCase(repository, auditLog),
    auditLog
  );
  const enrollProviderNodeUseCase = new EnrollProviderNodeUseCase(
    repository,
    auditLog
  );
  const recordProviderBenchmarkUseCase = new RecordProviderBenchmarkUseCase(
    repository,
    auditLog
  );
  const listProviderInventoryUseCase = new ListProviderInventoryUseCase(
    repository
  );
  const getProviderNodeDetailUseCase = new GetProviderNodeDetailUseCase(
    repository
  );
  const upsertProviderNodeRoutingProfileUseCase =
    new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog);
  const listProviderBenchmarkHistoryUseCase =
    new ListProviderBenchmarkHistoryUseCase(repository);
  const admitProviderRuntimeWorkloadBundleUseCase =
    new AdmitProviderRuntimeWorkloadBundleUseCase(
      getProviderNodeDetailUseCase,
      verifySignedWorkloadBundleAdmissionUseCase
    );
  const app = buildApp({
    createOrganizationUseCase,
    issueOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase,
    updateOrganizationMemberRoleUseCase,
    issueOrganizationApiKeyUseCase,
    authenticateOrganizationApiKeyUseCase,
    recordCustomerChargeUseCase,
    recordCompletedJobSettlementUseCase,
    getStagedPayoutExportUseCase,
    getOrganizationWalletSummaryUseCase,
    getConsumerDashboardOverviewUseCase,
    getProviderDashboardOverviewUseCase,
    executeChatCompletionUseCase,
    listPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase,
    enrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase,
    listProviderInventoryUseCase,
    getProviderNodeDetailUseCase,
    upsertProviderNodeRoutingProfileUseCase,
    listProviderBenchmarkHistoryUseCase,
    admitProviderRuntimeWorkloadBundleUseCase
  });

  try {
    await app.listen({ host: settings.host, port: settings.port });
  } catch (error) {
    await app.close();
    await pool.end();
    throw error;
  }
}

void startServer();
