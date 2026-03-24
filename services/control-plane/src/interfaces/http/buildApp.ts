import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyRawBody from "fastify-raw-body";
import type { GenerateDpaExportUseCase } from "../../application/compliance/GenerateDpaExportUseCase.js";
import type { GetSubprocessorRegistryUseCase } from "../../application/compliance/GetSubprocessorRegistryUseCase.js";
import type { CancelGatewayBatchUseCase } from "../../application/batch/CancelGatewayBatchUseCase.js";
import type { CreateGatewayBatchUseCase } from "../../application/batch/CreateGatewayBatchUseCase.js";
import type { GetGatewayBatchUseCase } from "../../application/batch/GetGatewayBatchUseCase.js";
import type { GetGatewayFileUseCase } from "../../application/batch/GetGatewayFileUseCase.js";
import type { UploadGatewayFileUseCase } from "../../application/batch/UploadGatewayFileUseCase.js";
import type { GetComplianceOverviewUseCase } from "../../application/dashboard/GetComplianceOverviewUseCase.js";
import type { GetConsumerDisputeDashboardUseCase } from "../../application/dashboard/GetConsumerDisputeDashboardUseCase.js";
import type { GetConsumerDashboardOverviewUseCase } from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import type { GetPrivateConnectorDashboardUseCase } from "../../application/dashboard/GetPrivateConnectorDashboardUseCase.js";
import type { GetProviderDashboardOverviewUseCase } from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import type { GetProviderDisputeDashboardUseCase } from "../../application/dashboard/GetProviderDisputeDashboardUseCase.js";
import type { GetProviderPricingSimulatorUseCase } from "../../application/dashboard/GetProviderPricingSimulatorUseCase.js";
import type { CreateProviderDisputeUseCase } from "../../application/dispute/CreateProviderDisputeUseCase.js";
import type { GetFraudReviewAlertsUseCase } from "../../application/fraud/GetFraudReviewAlertsUseCase.js";
import type { GetOrganizationWalletSummaryUseCase } from "../../application/ledger/GetOrganizationWalletSummaryUseCase.js";
import type { GetStagedPayoutExportUseCase } from "../../application/ledger/GetStagedPayoutExportUseCase.js";
import type { GetProviderPayoutAccountStatusUseCase } from "../../application/payout/GetProviderPayoutAccountStatusUseCase.js";
import type { GetProviderPayoutAvailabilityUseCase } from "../../application/payout/GetProviderPayoutAvailabilityUseCase.js";
import type { IssueProviderPayoutOnboardingLinkUseCase } from "../../application/payout/IssueProviderPayoutOnboardingLinkUseCase.js";
import type { ListProviderDisputesUseCase } from "../../application/dispute/ListProviderDisputesUseCase.js";
import type { ProcessStripeDisputeWebhookUseCase } from "../../application/dispute/ProcessStripeDisputeWebhookUseCase.js";
import type { ProcessStripeConnectWebhookUseCase } from "../../application/payout/ProcessStripeConnectWebhookUseCase.js";
import type { RecordProviderDisputeAllocationsUseCase } from "../../application/dispute/RecordProviderDisputeAllocationsUseCase.js";
import type { RecordCompletedJobSettlementUseCase } from "../../application/ledger/RecordCompletedJobSettlementUseCase.js";
import type { RecordCustomerChargeUseCase } from "../../application/ledger/RecordCustomerChargeUseCase.js";
import type { TransitionProviderDisputeStatusUseCase } from "../../application/dispute/TransitionProviderDisputeStatusUseCase.js";
import type { AuthenticateOrganizationApiKeyUseCase } from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { AcceptOrganizationInvitationUseCase } from "../../application/identity/AcceptOrganizationInvitationUseCase.js";
import type { CreateOrganizationUseCase } from "../../application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../application/identity/IssueOrganizationApiKeyUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { ExecuteChatCompletionUseCase } from "../../application/gateway/ExecuteChatCompletionUseCase.js";
import type { ExecuteEmbeddingUseCase } from "../../application/gateway/ExecuteEmbeddingUseCase.js";
import type { CreatePrivateConnectorUseCase } from "../../application/privateConnector/CreatePrivateConnectorUseCase.js";
import type { ListPrivateConnectorsUseCase } from "../../application/privateConnector/ListPrivateConnectorsUseCase.js";
import type { RecordPrivateConnectorCheckInUseCase } from "../../application/privateConnector/RecordPrivateConnectorCheckInUseCase.js";
import type { AdmitPrivateConnectorExecutionGrantUseCase } from "../../application/privateConnector/AdmitPrivateConnectorExecutionGrantUseCase.js";
import type { ListPlacementCandidatesUseCase } from "../../application/placement/ListPlacementCandidatesUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../application/placement/ResolveSyncPlacementUseCase.js";
import type { AdmitProviderRuntimeWorkloadBundleUseCase } from "../../application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../application/provider/GetProviderNodeDetailUseCase.js";
import type { IssueProviderNodeAttestationChallengeUseCase } from "../../application/provider/IssueProviderNodeAttestationChallengeUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../application/provider/RecordProviderBenchmarkUseCase.js";
import type { SubmitProviderNodeAttestationUseCase } from "../../application/provider/SubmitProviderNodeAttestationUseCase.js";
import type { ReplaceProviderNodeRoutingStateUseCase } from "../../application/provider/ReplaceProviderNodeRoutingStateUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { registerBatchRoutes } from "./batchRoutes.js";
import { registerComplianceRoutes } from "./complianceRoutes.js";
import { registerDashboardRoutes } from "./dashboardRoutes.js";
import { registerFileRoutes } from "./fileRoutes.js";
import { registerFinanceRoutes } from "./financeRoutes.js";
import { registerInvitationRoutes } from "./invitationRoutes.js";
import { registerGatewayRoutes } from "./gatewayRoutes.js";
import { registerOrganizationRoutes } from "./organizationRoutes.js";
import { registerPlacementRoutes } from "./placementRoutes.js";
import { registerPrivateConnectorRoutes } from "./privateConnectorRoutes.js";
import { registerProviderRoutes } from "./providerRoutes.js";
import { registerRiskRoutes } from "./riskRoutes.js";
import { registerStripeWebhookRoutes } from "./stripeWebhookRoutes.js";

export function buildApp(dependencies: {
  createOrganizationUseCase: Pick<CreateOrganizationUseCase, "execute">;
  issueOrganizationInvitationUseCase: Pick<
    IssueOrganizationInvitationUseCase,
    "execute"
  >;
  acceptOrganizationInvitationUseCase: Pick<
    AcceptOrganizationInvitationUseCase,
    "execute"
  >;
  updateOrganizationMemberRoleUseCase: Pick<
    UpdateOrganizationMemberRoleUseCase,
    "execute"
  >;
  issueOrganizationApiKeyUseCase: Pick<
    IssueOrganizationApiKeyUseCase,
    "execute"
  >;
  authenticateOrganizationApiKeyUseCase: Pick<
    AuthenticateOrganizationApiKeyUseCase,
    "execute"
  >;
  recordCustomerChargeUseCase: Pick<RecordCustomerChargeUseCase, "execute">;
  recordCompletedJobSettlementUseCase: Pick<
    RecordCompletedJobSettlementUseCase,
    "execute"
  >;
  getStagedPayoutExportUseCase: Pick<GetStagedPayoutExportUseCase, "execute">;
  getOrganizationWalletSummaryUseCase: Pick<
    GetOrganizationWalletSummaryUseCase,
    "execute"
  >;
  issueProviderPayoutOnboardingLinkUseCase?: Pick<
    IssueProviderPayoutOnboardingLinkUseCase,
    "execute"
  >;
  getProviderPayoutAccountStatusUseCase?: Pick<
    GetProviderPayoutAccountStatusUseCase,
    "execute"
  >;
  getProviderPayoutAvailabilityUseCase?: Pick<
    GetProviderPayoutAvailabilityUseCase,
    "execute"
  >;
  createProviderDisputeUseCase?: Pick<CreateProviderDisputeUseCase, "execute">;
  listProviderDisputesUseCase?: Pick<ListProviderDisputesUseCase, "execute">;
  recordProviderDisputeAllocationsUseCase?: Pick<
    RecordProviderDisputeAllocationsUseCase,
    "execute"
  >;
  transitionProviderDisputeStatusUseCase?: Pick<
    TransitionProviderDisputeStatusUseCase,
    "execute"
  >;
  processStripeConnectWebhookUseCase?: Pick<
    ProcessStripeConnectWebhookUseCase,
    "execute"
  >;
  processStripeDisputeWebhookUseCase?: Pick<
    ProcessStripeDisputeWebhookUseCase,
    "execute"
  >;
  getConsumerDisputeDashboardUseCase?: Pick<
    GetConsumerDisputeDashboardUseCase,
    "execute"
  >;
  getConsumerDashboardOverviewUseCase: Pick<
    GetConsumerDashboardOverviewUseCase,
    "execute"
  >;
  getComplianceOverviewUseCase?: Pick<GetComplianceOverviewUseCase, "execute">;
  getSubprocessorRegistryUseCase?: Pick<GetSubprocessorRegistryUseCase, "execute">;
  generateDpaExportUseCase?: Pick<GenerateDpaExportUseCase, "execute">;
  getProviderDashboardOverviewUseCase: Pick<
    GetProviderDashboardOverviewUseCase,
    "execute"
  >;
  getProviderDisputeDashboardUseCase?: Pick<
    GetProviderDisputeDashboardUseCase,
    "execute"
  >;
  getPrivateConnectorDashboardUseCase?: Pick<
    GetPrivateConnectorDashboardUseCase,
    "execute"
  >;
  getProviderPricingSimulatorUseCase?: Pick<
    GetProviderPricingSimulatorUseCase,
    "execute"
  >;
  getFraudReviewAlertsUseCase?: Pick<GetFraudReviewAlertsUseCase, "execute">;
  executeChatCompletionUseCase: Pick<ExecuteChatCompletionUseCase, "execute">;
  executeEmbeddingUseCase?: Pick<ExecuteEmbeddingUseCase, "execute">;
  createPrivateConnectorUseCase?: Pick<CreatePrivateConnectorUseCase, "execute">;
  listPrivateConnectorsUseCase?: Pick<ListPrivateConnectorsUseCase, "execute">;
  recordPrivateConnectorCheckInUseCase?: Pick<
    RecordPrivateConnectorCheckInUseCase,
    "execute"
  >;
  admitPrivateConnectorExecutionGrantUseCase?: Pick<
    AdmitPrivateConnectorExecutionGrantUseCase,
    "execute"
  >;
  uploadGatewayFileUseCase?: Pick<UploadGatewayFileUseCase, "execute">;
  getGatewayFileUseCase?: Pick<GetGatewayFileUseCase, "execute">;
  createGatewayBatchUseCase?: Pick<CreateGatewayBatchUseCase, "execute">;
  getGatewayBatchUseCase?: Pick<GetGatewayBatchUseCase, "execute">;
  cancelGatewayBatchUseCase?: Pick<CancelGatewayBatchUseCase, "execute">;
  listPlacementCandidatesUseCase: Pick<
    ListPlacementCandidatesUseCase,
    "execute"
  >;
  resolveSyncPlacementUseCase: Pick<ResolveSyncPlacementUseCase, "execute">;
  enrollProviderNodeUseCase: Pick<EnrollProviderNodeUseCase, "execute">;
  recordProviderBenchmarkUseCase: Pick<
    RecordProviderBenchmarkUseCase,
    "execute"
  >;
  listProviderInventoryUseCase: Pick<ListProviderInventoryUseCase, "execute">;
  getProviderNodeDetailUseCase: Pick<GetProviderNodeDetailUseCase, "execute">;
  issueProviderNodeAttestationChallengeUseCase: Pick<
    IssueProviderNodeAttestationChallengeUseCase,
    "execute"
  >;
  submitProviderNodeAttestationUseCase: Pick<
    SubmitProviderNodeAttestationUseCase,
    "execute"
  >;
  replaceProviderNodeRoutingStateUseCase?: Pick<
    ReplaceProviderNodeRoutingStateUseCase,
    "execute"
  >;
  upsertProviderNodeRoutingProfileUseCase: Pick<
    UpsertProviderNodeRoutingProfileUseCase,
    "execute"
  >;
  listProviderBenchmarkHistoryUseCase: Pick<
    ListProviderBenchmarkHistoryUseCase,
    "execute"
  >;
  admitProviderRuntimeWorkloadBundleUseCase: Pick<
    AdmitProviderRuntimeWorkloadBundleUseCase,
    "execute"
  >;
}): FastifyInstance {
  const app = Fastify();
  void app.register(multipart);
  void app.register(fastifyRawBody, {
    field: "rawBody",
    global: true,
    encoding: "utf8",
    runFirst: true
  });

  registerOrganizationRoutes(
    app,
    dependencies.createOrganizationUseCase,
    dependencies.updateOrganizationMemberRoleUseCase,
    dependencies.issueOrganizationApiKeyUseCase,
    dependencies.authenticateOrganizationApiKeyUseCase
  );
  registerInvitationRoutes(
    app,
    dependencies.issueOrganizationInvitationUseCase,
    dependencies.acceptOrganizationInvitationUseCase,
    dependencies.authenticateOrganizationApiKeyUseCase
  );
  registerFinanceRoutes(
    app,
    dependencies.recordCustomerChargeUseCase,
    dependencies.recordCompletedJobSettlementUseCase,
    dependencies.getStagedPayoutExportUseCase,
    dependencies.getOrganizationWalletSummaryUseCase,
    dependencies.issueProviderPayoutOnboardingLinkUseCase,
    dependencies.getProviderPayoutAccountStatusUseCase,
    dependencies.getProviderPayoutAvailabilityUseCase,
    dependencies.createProviderDisputeUseCase,
    dependencies.listProviderDisputesUseCase,
    dependencies.recordProviderDisputeAllocationsUseCase,
    dependencies.transitionProviderDisputeStatusUseCase
  );
  if (
    dependencies.processStripeConnectWebhookUseCase !== undefined ||
    dependencies.processStripeDisputeWebhookUseCase !== undefined
  ) {
    registerStripeWebhookRoutes(
      app,
      dependencies.processStripeConnectWebhookUseCase,
      dependencies.processStripeDisputeWebhookUseCase
    );
  }
  registerDashboardRoutes(
    app,
    dependencies.getComplianceOverviewUseCase,
    dependencies.getConsumerDisputeDashboardUseCase,
    dependencies.getConsumerDashboardOverviewUseCase,
    dependencies.getProviderDashboardOverviewUseCase,
    dependencies.getProviderDisputeDashboardUseCase,
    dependencies.getPrivateConnectorDashboardUseCase,
    dependencies.getProviderPricingSimulatorUseCase
  );
  if (
    dependencies.getSubprocessorRegistryUseCase !== undefined &&
    dependencies.generateDpaExportUseCase !== undefined
  ) {
    registerComplianceRoutes(
      app,
      dependencies.getSubprocessorRegistryUseCase,
      dependencies.generateDpaExportUseCase
    );
  }
  if (dependencies.getFraudReviewAlertsUseCase !== undefined) {
    registerRiskRoutes(app, dependencies.getFraudReviewAlertsUseCase);
  }
  registerPlacementRoutes(
    app,
    dependencies.authenticateOrganizationApiKeyUseCase,
    dependencies.listPlacementCandidatesUseCase,
    dependencies.resolveSyncPlacementUseCase
  );
  registerGatewayRoutes(
    app,
    dependencies.executeChatCompletionUseCase as ExecuteChatCompletionUseCase,
    dependencies.executeEmbeddingUseCase
  );
  if (
    dependencies.createPrivateConnectorUseCase !== undefined &&
    dependencies.listPrivateConnectorsUseCase !== undefined &&
    dependencies.recordPrivateConnectorCheckInUseCase !== undefined &&
    dependencies.admitPrivateConnectorExecutionGrantUseCase !== undefined
  ) {
    registerPrivateConnectorRoutes(
      app,
      dependencies.authenticateOrganizationApiKeyUseCase,
      dependencies.createPrivateConnectorUseCase,
      dependencies.listPrivateConnectorsUseCase,
      dependencies.recordPrivateConnectorCheckInUseCase,
      dependencies.admitPrivateConnectorExecutionGrantUseCase
    );
  }
  if (
    dependencies.uploadGatewayFileUseCase !== undefined &&
    dependencies.getGatewayFileUseCase !== undefined
  ) {
    registerFileRoutes(
      app,
      dependencies.uploadGatewayFileUseCase,
      dependencies.getGatewayFileUseCase
    );
  }
  if (
    dependencies.createGatewayBatchUseCase !== undefined &&
    dependencies.getGatewayBatchUseCase !== undefined &&
    dependencies.cancelGatewayBatchUseCase !== undefined
  ) {
    registerBatchRoutes(
      app,
      dependencies.createGatewayBatchUseCase,
      dependencies.getGatewayBatchUseCase,
      dependencies.cancelGatewayBatchUseCase
    );
  }
  registerProviderRoutes(
    app,
    dependencies.authenticateOrganizationApiKeyUseCase,
    dependencies.enrollProviderNodeUseCase,
    dependencies.recordProviderBenchmarkUseCase,
    dependencies.listProviderInventoryUseCase,
    dependencies.getProviderNodeDetailUseCase,
    dependencies.issueProviderNodeAttestationChallengeUseCase,
    dependencies.submitProviderNodeAttestationUseCase,
    dependencies.replaceProviderNodeRoutingStateUseCase,
    dependencies.upsertProviderNodeRoutingProfileUseCase,
    dependencies.listProviderBenchmarkHistoryUseCase,
    dependencies.admitProviderRuntimeWorkloadBundleUseCase
  );

  return app;
}
