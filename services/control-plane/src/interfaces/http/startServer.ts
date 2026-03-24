import "dotenv/config";
import { Pool } from "pg";
import { GenerateDpaExportUseCase } from "../../application/compliance/GenerateDpaExportUseCase.js";
import { GetSubprocessorRegistryUseCase } from "../../application/compliance/GetSubprocessorRegistryUseCase.js";
import { GetComplianceOverviewUseCase } from "../../application/dashboard/GetComplianceOverviewUseCase.js";
import { GetConsumerDisputeDashboardUseCase } from "../../application/dashboard/GetConsumerDisputeDashboardUseCase.js";
import { GetConsumerDashboardOverviewUseCase } from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetPrivateConnectorDashboardUseCase } from "../../application/dashboard/GetPrivateConnectorDashboardUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { GetProviderDisputeDashboardUseCase } from "../../application/dashboard/GetProviderDisputeDashboardUseCase.js";
import { GetProviderPricingSimulatorUseCase } from "../../application/dashboard/GetProviderPricingSimulatorUseCase.js";
import { CreateProviderDisputeUseCase } from "../../application/dispute/CreateProviderDisputeUseCase.js";
import { GetFraudReviewAlertsUseCase } from "../../application/fraud/GetFraudReviewAlertsUseCase.js";
import { CancelGatewayBatchUseCase } from "../../application/batch/CancelGatewayBatchUseCase.js";
import { CreateGatewayBatchUseCase } from "../../application/batch/CreateGatewayBatchUseCase.js";
import { GetGatewayBatchUseCase } from "../../application/batch/GetGatewayBatchUseCase.js";
import { GetGatewayFileUseCase } from "../../application/batch/GetGatewayFileUseCase.js";
import { UploadGatewayFileUseCase } from "../../application/batch/UploadGatewayFileUseCase.js";
import { GetOrganizationWalletSummaryUseCase } from "../../application/ledger/GetOrganizationWalletSummaryUseCase.js";
import { GetStagedPayoutExportUseCase } from "../../application/ledger/GetStagedPayoutExportUseCase.js";
import { ListProviderDisputesUseCase } from "../../application/dispute/ListProviderDisputesUseCase.js";
import { GetProviderPayoutAccountStatusUseCase } from "../../application/payout/GetProviderPayoutAccountStatusUseCase.js";
import { GetProviderPayoutAvailabilityUseCase } from "../../application/payout/GetProviderPayoutAvailabilityUseCase.js";
import { IssueProviderPayoutOnboardingLinkUseCase } from "../../application/payout/IssueProviderPayoutOnboardingLinkUseCase.js";
import { ProcessStripeDisputeWebhookUseCase } from "../../application/dispute/ProcessStripeDisputeWebhookUseCase.js";
import { ProcessStripeConnectWebhookUseCase } from "../../application/payout/ProcessStripeConnectWebhookUseCase.js";
import { RecordProviderDisputeAllocationsUseCase } from "../../application/dispute/RecordProviderDisputeAllocationsUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../application/ledger/RecordCustomerChargeUseCase.js";
import { TransitionProviderDisputeStatusUseCase } from "../../application/dispute/TransitionProviderDisputeStatusUseCase.js";
import { AuthenticateOrganizationApiKeyUseCase } from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { AuthenticateGatewayApiKeyUseCase } from "../../application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { AcceptOrganizationInvitationUseCase } from "../../application/identity/AcceptOrganizationInvitationUseCase.js";
import { CreateOrganizationUseCase } from "../../application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../application/identity/IssueOrganizationApiKeyUseCase.js";
import { IssueOrganizationInvitationUseCase } from "../../application/identity/IssueOrganizationInvitationUseCase.js";
import { UpdateOrganizationMemberRoleUseCase } from "../../application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { ExecuteChatCompletionUseCase } from "../../application/gateway/ExecuteChatCompletionUseCase.js";
import { ExecuteEmbeddingUseCase } from "../../application/gateway/ExecuteEmbeddingUseCase.js";
import { GatewayUsageAdmissionUseCase } from "../../application/gateway/GatewayUsageAdmissionUseCase.js";
import { AdmitPrivateConnectorExecutionGrantUseCase } from "../../application/privateConnector/AdmitPrivateConnectorExecutionGrantUseCase.js";
import { CreatePrivateConnectorUseCase } from "../../application/privateConnector/CreatePrivateConnectorUseCase.js";
import { ListPrivateConnectorsUseCase } from "../../application/privateConnector/ListPrivateConnectorsUseCase.js";
import { RecordPrivateConnectorCheckInUseCase } from "../../application/privateConnector/RecordPrivateConnectorCheckInUseCase.js";
import { ResolvePrivateConnectorExecutionUseCase } from "../../application/privateConnector/ResolvePrivateConnectorExecutionUseCase.js";
import { RecordGatewayUsageMeterEventUseCase } from "../../application/metering/RecordGatewayUsageMeterEventUseCase.js";
import { PrepareSignedEmbeddingWorkloadBundleUseCase } from "../../application/workload/PrepareSignedEmbeddingWorkloadBundleUseCase.js";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { ListPlacementCandidatesUseCase } from "../../application/placement/ListPlacementCandidatesUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../application/placement/ResolveSyncPlacementUseCase.js";
import { AdmitProviderRuntimeWorkloadBundleUseCase } from "../../application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import { FetchGatewayUpstreamClient } from "../../infrastructure/gateway/FetchGatewayUpstreamClient.js";
import { EnrollProviderNodeUseCase } from "../../application/provider/EnrollProviderNodeUseCase.js";
import { GetProviderNodeDetailUseCase } from "../../application/provider/GetProviderNodeDetailUseCase.js";
import { IssueProviderNodeAttestationChallengeUseCase } from "../../application/provider/IssueProviderNodeAttestationChallengeUseCase.js";
import { ListProviderBenchmarkHistoryUseCase } from "../../application/provider/ListProviderBenchmarkHistoryUseCase.js";
import { ListProviderInventoryUseCase } from "../../application/provider/ListProviderInventoryUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../application/provider/RecordProviderBenchmarkUseCase.js";
import { ReplaceProviderNodeRoutingStateUseCase } from "../../application/provider/ReplaceProviderNodeRoutingStateUseCase.js";
import { SubmitProviderNodeAttestationUseCase } from "../../application/provider/SubmitProviderNodeAttestationUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { GatewayTrafficPolicy } from "../../config/GatewayTrafficPolicy.js";
import { loadControlPlaneProductDefaults } from "../../config/ControlPlaneProductDefaults.js";
import {
  loadComplianceDocumentSettings,
  loadComplianceMarkdownTemplates
} from "../../config/ComplianceDocumentSources.js";
import { loadControlPlaneSettings } from "../../config/ControlPlaneSettings.js";
import { StructuredConsoleAuditLog } from "../../infrastructure/observability/StructuredConsoleAuditLog.js";
import { StripeSdkConnectClient } from "../../infrastructure/payments/StripeConnectClient.js";
import { StripeSdkDisputeClient } from "../../infrastructure/payments/StripeDisputeClient.js";
import { IdentitySchemaInitializer } from "../../infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { PostgresPrivateConnectorRepository } from "../../infrastructure/persistence/postgres/PostgresPrivateConnectorRepository.js";
import { HmacPrivateConnectorExecutionGrantSignatureService } from "../../infrastructure/security/HmacPrivateConnectorExecutionGrantSignatureService.js";
import { HmacWorkloadBundleSignatureService } from "../../infrastructure/security/HmacWorkloadBundleSignatureService.js";
import { NodeCryptoProviderNodeAttestationVerifier } from "../../infrastructure/security/NodeCryptoProviderNodeAttestationVerifier.js";
import { buildApp } from "./buildApp.js";

async function startServer(): Promise<void> {
  const settings = loadControlPlaneSettings(process.env);
  const pool = new Pool({ connectionString: settings.databaseUrl });
  const schemaInitializer = new IdentitySchemaInitializer(pool);
  await schemaInitializer.ensureSchema();

  const repository = new PostgresIdentityRepository(pool);
  const privateConnectorRepository = new PostgresPrivateConnectorRepository(
    pool
  );
  const auditLog = new StructuredConsoleAuditLog();
  const productDefaults = loadControlPlaneProductDefaults();
  const gatewayTrafficPolicy = GatewayTrafficPolicy.load(process.env);
  const complianceDocumentSettings = loadComplianceDocumentSettings(
    process.env
  );
  const complianceMarkdownTemplates = loadComplianceMarkdownTemplates();
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
  const getProviderPayoutAvailabilityUseCase =
    settings.stripeSecretKey !== undefined &&
    settings.stripeWebhookSecret !== undefined &&
    settings.stripeConnectReturnUrlBase !== undefined &&
    settings.stripeConnectRefreshUrlBase !== undefined
      ? new GetProviderPayoutAvailabilityUseCase(repository)
      : undefined;
  const createProviderDisputeUseCase = new CreateProviderDisputeUseCase(
    repository,
    auditLog
  );
  const listProviderDisputesUseCase = new ListProviderDisputesUseCase(
    repository
  );
  const recordProviderDisputeAllocationsUseCase =
    new RecordProviderDisputeAllocationsUseCase(repository, auditLog);
  const transitionProviderDisputeStatusUseCase =
    new TransitionProviderDisputeStatusUseCase(repository, auditLog);
  const getConsumerDashboardOverviewUseCase =
    new GetConsumerDashboardOverviewUseCase(repository, auditLog, {
      gatewayTrafficPolicy
    });
  const getConsumerDisputeDashboardUseCase =
    new GetConsumerDisputeDashboardUseCase(repository, auditLog);
  const getComplianceOverviewUseCase = new GetComplianceOverviewUseCase(
    repository,
    auditLog,
    complianceDocumentSettings,
    productDefaults.platformSubprocessors
  );
  const getSubprocessorRegistryUseCase = new GetSubprocessorRegistryUseCase(
    complianceDocumentSettings,
    productDefaults.platformSubprocessors
  );
  const generateDpaExportUseCase = new GenerateDpaExportUseCase(
    repository,
    auditLog,
    complianceDocumentSettings,
    productDefaults.platformSubprocessors,
    complianceMarkdownTemplates
  );
  const getPrivateConnectorDashboardUseCase =
    new GetPrivateConnectorDashboardUseCase(
      privateConnectorRepository,
      auditLog
    );
  const getProviderDashboardOverviewUseCase =
    new GetProviderDashboardOverviewUseCase(repository, auditLog);
  const getProviderDisputeDashboardUseCase =
    new GetProviderDisputeDashboardUseCase(repository, auditLog);
  const getProviderPricingSimulatorUseCase =
    new GetProviderPricingSimulatorUseCase(repository, auditLog);
  const getFraudReviewAlertsUseCase = new GetFraudReviewAlertsUseCase(
    repository,
    auditLog,
    productDefaults.fraudDetectionPolicy
  );
  const listPlacementCandidatesUseCase = new ListPlacementCandidatesUseCase(
    repository
  );
  const resolveSyncPlacementUseCase = new ResolveSyncPlacementUseCase(
    repository,
    auditLog
  );
  const approvedChatModelCatalog = productDefaults.approvedChatModelCatalog;
  const approvedEmbeddingModelCatalog =
    productDefaults.approvedEmbeddingModelCatalog;
  const workloadBundleSignatureService = new HmacWorkloadBundleSignatureService(
    settings.workloadBundleSigningKey,
    settings.workloadBundleSigningKeyId
  );
  const privateConnectorExecutionGrantSignatureService =
    new HmacPrivateConnectorExecutionGrantSignatureService(
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
  const prepareSignedChatWorkloadBundleUseCase =
    new PrepareSignedChatWorkloadBundleUseCase(
      workloadBundleSignatureService,
      verifySignedWorkloadBundleAdmissionUseCase
    );
  const prepareSignedEmbeddingWorkloadBundleUseCase =
    new PrepareSignedEmbeddingWorkloadBundleUseCase(
      workloadBundleSignatureService,
      verifySignedWorkloadBundleAdmissionUseCase
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
  const createPrivateConnectorUseCase = new CreatePrivateConnectorUseCase(
    privateConnectorRepository,
    auditLog
  );
  const listPrivateConnectorsUseCase = new ListPrivateConnectorsUseCase(
    privateConnectorRepository
  );
  const recordPrivateConnectorCheckInUseCase =
    new RecordPrivateConnectorCheckInUseCase(
      privateConnectorRepository,
      auditLog
    );
  const admitPrivateConnectorExecutionGrantUseCase =
    new AdmitPrivateConnectorExecutionGrantUseCase(
      privateConnectorRepository,
      privateConnectorExecutionGrantSignatureService,
      auditLog
    );
  const resolvePrivateConnectorExecutionUseCase =
    new ResolvePrivateConnectorExecutionUseCase(
      privateConnectorRepository,
      privateConnectorExecutionGrantSignatureService
    );
  const executeChatCompletionUseCase = new ExecuteChatCompletionUseCase(
    authenticateGatewayApiKeyUseCase,
    approvedChatModelCatalog,
    resolveSyncPlacementUseCase,
    prepareSignedChatWorkloadBundleUseCase,
    new FetchGatewayUpstreamClient(),
    gatewayUsageMeterEventUseCase,
    auditLog,
    gatewayUsageAdmissionUseCase,
    { resolvePrivateConnectorExecutionUseCase }
  );
  const executeEmbeddingUseCase = new ExecuteEmbeddingUseCase(
    authenticateGatewayApiKeyUseCase,
    approvedEmbeddingModelCatalog,
    resolveSyncPlacementUseCase,
    prepareSignedEmbeddingWorkloadBundleUseCase,
    new FetchGatewayUpstreamClient(),
    gatewayUsageMeterEventUseCase,
    auditLog,
    gatewayUsageAdmissionUseCase
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
  const issueProviderNodeAttestationChallengeUseCase =
    new IssueProviderNodeAttestationChallengeUseCase(
      repository,
      productDefaults.providerNodeAttestationPolicy,
      auditLog
    );
  const submitProviderNodeAttestationUseCase =
    new SubmitProviderNodeAttestationUseCase(
      repository,
      new NodeCryptoProviderNodeAttestationVerifier(
        productDefaults.providerNodeAttestationPolicy
      ),
      productDefaults.providerNodeAttestationPolicy,
      auditLog
    );
  const upsertProviderNodeRoutingProfileUseCase =
    new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog);
  const replaceProviderNodeRoutingStateUseCase =
    new ReplaceProviderNodeRoutingStateUseCase(
      repository,
      approvedChatModelCatalog,
      productDefaults.placementScoringPolicy,
      auditLog
    );
  const listProviderBenchmarkHistoryUseCase =
    new ListProviderBenchmarkHistoryUseCase(repository);
  const admitProviderRuntimeWorkloadBundleUseCase =
    new AdmitProviderRuntimeWorkloadBundleUseCase(
      getProviderNodeDetailUseCase,
      verifySignedWorkloadBundleAdmissionUseCase
    );
  const uploadGatewayFileUseCase = new UploadGatewayFileUseCase(
    authenticateGatewayApiKeyUseCase,
    repository
  );
  const getGatewayFileUseCase = new GetGatewayFileUseCase(
    authenticateGatewayApiKeyUseCase,
    repository
  );
  const createGatewayBatchUseCase = new CreateGatewayBatchUseCase(
    authenticateGatewayApiKeyUseCase,
    repository,
    auditLog,
    { gatewayTrafficPolicy }
  );
  const getGatewayBatchUseCase = new GetGatewayBatchUseCase(
    authenticateGatewayApiKeyUseCase,
    repository
  );
  const cancelGatewayBatchUseCase = new CancelGatewayBatchUseCase(
    authenticateGatewayApiKeyUseCase,
    repository,
    auditLog
  );
  const stripeConnectClient =
    settings.stripeSecretKey !== undefined &&
    settings.stripeWebhookSecret !== undefined &&
    settings.stripeConnectReturnUrlBase !== undefined &&
    settings.stripeConnectRefreshUrlBase !== undefined
      ? new StripeSdkConnectClient(
          settings.stripeSecretKey,
          settings.stripeWebhookSecret
        )
      : undefined;
  const stripeConnectReturnUrlBase = settings.stripeConnectReturnUrlBase;
  const stripeConnectRefreshUrlBase = settings.stripeConnectRefreshUrlBase;
  const stripeDisputeClient =
    settings.stripeSecretKey !== undefined &&
    settings.stripeDisputeWebhookSecret !== undefined
      ? new StripeSdkDisputeClient(
          settings.stripeSecretKey,
          settings.stripeDisputeWebhookSecret
        )
      : undefined;
  const issueProviderPayoutOnboardingLinkUseCase =
    stripeConnectClient === undefined ||
    stripeConnectReturnUrlBase === undefined ||
    stripeConnectRefreshUrlBase === undefined
      ? undefined
      : new IssueProviderPayoutOnboardingLinkUseCase(
          repository,
          stripeConnectClient,
          auditLog,
          stripeConnectReturnUrlBase,
          stripeConnectRefreshUrlBase
        );
  const getProviderPayoutAccountStatusUseCase =
    stripeConnectClient === undefined
      ? undefined
      : new GetProviderPayoutAccountStatusUseCase(
          repository,
          stripeConnectClient,
          auditLog
        );
  const processStripeConnectWebhookUseCase =
    stripeConnectClient === undefined
      ? undefined
      : new ProcessStripeConnectWebhookUseCase(
          repository,
          stripeConnectClient,
          auditLog
        );
  const processStripeDisputeWebhookUseCase =
    stripeDisputeClient === undefined
      ? undefined
      : new ProcessStripeDisputeWebhookUseCase(
          repository,
          stripeDisputeClient,
          auditLog
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
    ...(issueProviderPayoutOnboardingLinkUseCase === undefined
      ? {}
      : { issueProviderPayoutOnboardingLinkUseCase }),
    ...(getProviderPayoutAccountStatusUseCase === undefined
      ? {}
      : { getProviderPayoutAccountStatusUseCase }),
    ...(getProviderPayoutAvailabilityUseCase === undefined
      ? {}
      : { getProviderPayoutAvailabilityUseCase }),
    createProviderDisputeUseCase,
    listProviderDisputesUseCase,
    recordProviderDisputeAllocationsUseCase,
    transitionProviderDisputeStatusUseCase,
    ...(processStripeConnectWebhookUseCase === undefined
      ? {}
      : { processStripeConnectWebhookUseCase }),
    ...(processStripeDisputeWebhookUseCase === undefined
      ? {}
      : { processStripeDisputeWebhookUseCase }),
    getComplianceOverviewUseCase,
    getConsumerDisputeDashboardUseCase,
    getConsumerDashboardOverviewUseCase,
    getSubprocessorRegistryUseCase,
    generateDpaExportUseCase,
    getProviderDashboardOverviewUseCase,
    getProviderDisputeDashboardUseCase,
    getPrivateConnectorDashboardUseCase,
    getProviderPricingSimulatorUseCase,
    getFraudReviewAlertsUseCase,
    executeChatCompletionUseCase,
    executeEmbeddingUseCase,
    createPrivateConnectorUseCase,
    listPrivateConnectorsUseCase,
    recordPrivateConnectorCheckInUseCase,
    admitPrivateConnectorExecutionGrantUseCase,
    uploadGatewayFileUseCase,
    getGatewayFileUseCase,
    createGatewayBatchUseCase,
    getGatewayBatchUseCase,
    cancelGatewayBatchUseCase,
    listPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase,
    enrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase,
    listProviderInventoryUseCase,
    getProviderNodeDetailUseCase,
    issueProviderNodeAttestationChallengeUseCase,
    submitProviderNodeAttestationUseCase,
    replaceProviderNodeRoutingStateUseCase,
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
