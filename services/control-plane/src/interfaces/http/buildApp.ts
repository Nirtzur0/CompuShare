import Fastify, { type FastifyInstance } from "fastify";
import type { GetConsumerDashboardOverviewUseCase } from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import type { GetProviderDashboardOverviewUseCase } from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import type { GetOrganizationWalletSummaryUseCase } from "../../application/ledger/GetOrganizationWalletSummaryUseCase.js";
import type { GetStagedPayoutExportUseCase } from "../../application/ledger/GetStagedPayoutExportUseCase.js";
import type { RecordCompletedJobSettlementUseCase } from "../../application/ledger/RecordCompletedJobSettlementUseCase.js";
import type { RecordCustomerChargeUseCase } from "../../application/ledger/RecordCustomerChargeUseCase.js";
import type { AuthenticateOrganizationApiKeyUseCase } from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { AcceptOrganizationInvitationUseCase } from "../../application/identity/AcceptOrganizationInvitationUseCase.js";
import type { CreateOrganizationUseCase } from "../../application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../application/identity/IssueOrganizationApiKeyUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { ExecuteChatCompletionUseCase } from "../../application/gateway/ExecuteChatCompletionUseCase.js";
import type { ListPlacementCandidatesUseCase } from "../../application/placement/ListPlacementCandidatesUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../application/placement/ResolveSyncPlacementUseCase.js";
import type { AdmitProviderRuntimeWorkloadBundleUseCase } from "../../application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../application/provider/GetProviderNodeDetailUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../application/provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { registerDashboardRoutes } from "./dashboardRoutes.js";
import { registerFinanceRoutes } from "./financeRoutes.js";
import { registerInvitationRoutes } from "./invitationRoutes.js";
import { registerGatewayRoutes } from "./gatewayRoutes.js";
import { registerOrganizationRoutes } from "./organizationRoutes.js";
import { registerPlacementRoutes } from "./placementRoutes.js";
import { registerProviderRoutes } from "./providerRoutes.js";

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
  getConsumerDashboardOverviewUseCase: Pick<
    GetConsumerDashboardOverviewUseCase,
    "execute"
  >;
  getProviderDashboardOverviewUseCase: Pick<
    GetProviderDashboardOverviewUseCase,
    "execute"
  >;
  executeChatCompletionUseCase: Pick<ExecuteChatCompletionUseCase, "execute">;
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
    dependencies.getOrganizationWalletSummaryUseCase
  );
  registerDashboardRoutes(
    app,
    dependencies.getConsumerDashboardOverviewUseCase,
    dependencies.getProviderDashboardOverviewUseCase
  );
  registerPlacementRoutes(
    app,
    dependencies.authenticateOrganizationApiKeyUseCase,
    dependencies.listPlacementCandidatesUseCase,
    dependencies.resolveSyncPlacementUseCase
  );
  registerGatewayRoutes(
    app,
    dependencies.executeChatCompletionUseCase as ExecuteChatCompletionUseCase
  );
  registerProviderRoutes(
    app,
    dependencies.authenticateOrganizationApiKeyUseCase,
    dependencies.enrollProviderNodeUseCase,
    dependencies.recordProviderBenchmarkUseCase,
    dependencies.listProviderInventoryUseCase,
    dependencies.getProviderNodeDetailUseCase,
    dependencies.upsertProviderNodeRoutingProfileUseCase,
    dependencies.listProviderBenchmarkHistoryUseCase,
    dependencies.admitProviderRuntimeWorkloadBundleUseCase
  );

  return app;
}
