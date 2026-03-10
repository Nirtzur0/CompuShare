import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { GetFraudReviewAlertsUseCase } from "../../../src/application/fraud/GetFraudReviewAlertsUseCase.js";
import {
  FraudReviewAuthorizationError,
  FraudReviewOrganizationNotFoundError
} from "../../../src/application/fraud/GetFraudReviewAlertsUseCase.js";
import type { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import type { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { GetOrganizationWalletSummaryUseCase } from "../../../src/application/ledger/GetOrganizationWalletSummaryUseCase.js";
import type { GetStagedPayoutExportUseCase } from "../../../src/application/ledger/GetStagedPayoutExportUseCase.js";
import type { RecordCompletedJobSettlementUseCase } from "../../../src/application/ledger/RecordCompletedJobSettlementUseCase.js";
import type { RecordCustomerChargeUseCase } from "../../../src/application/ledger/RecordCustomerChargeUseCase.js";
import type { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function buildRiskApp(input?: {
  getFraudReviewAlertsExecute?: GetFraudReviewAlertsUseCase["execute"];
}): FastifyInstance {
  const unusedExecute = () => Promise.reject(new Error("unused"));

  return buildApp({
    createOrganizationUseCase: { execute: unusedExecute } as unknown as CreateOrganizationUseCase,
    issueOrganizationInvitationUseCase: {
      execute: unusedExecute
    } as unknown as IssueOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase: {
      execute: unusedExecute
    } as unknown as AcceptOrganizationInvitationUseCase,
    updateOrganizationMemberRoleUseCase: {
      execute: unusedExecute
    } as unknown as UpdateOrganizationMemberRoleUseCase,
    issueOrganizationApiKeyUseCase: {
      execute: unusedExecute
    } as unknown as IssueOrganizationApiKeyUseCase,
    authenticateOrganizationApiKeyUseCase: {
      execute: unusedExecute
    } as unknown as AuthenticateOrganizationApiKeyUseCase,
    recordCustomerChargeUseCase: {
      execute: unusedExecute
    } as unknown as RecordCustomerChargeUseCase,
    recordCompletedJobSettlementUseCase: {
      execute: unusedExecute
    } as unknown as RecordCompletedJobSettlementUseCase,
    getStagedPayoutExportUseCase: {
      execute: unusedExecute
    } as unknown as GetStagedPayoutExportUseCase,
    getOrganizationWalletSummaryUseCase: {
      execute: unusedExecute
    } as unknown as GetOrganizationWalletSummaryUseCase,
    getConsumerDashboardOverviewUseCase: { execute: unusedExecute },
    getProviderDashboardOverviewUseCase: { execute: unusedExecute },
    getFraudReviewAlertsUseCase: {
      execute:
        input?.getFraudReviewAlertsExecute ??
        (() =>
          Promise.resolve({
            graph: {
              scannedAt: "2026-03-10T12:00:00.000Z",
              lookbackDays: 30,
              counterpartyCount: 2,
              outgoingSettledUsd: "50.00",
              incomingSettledUsd: "10.00",
              alertCount: 1,
              highSeverityAlertCount: 1
            },
            alerts: [
              {
                signalType: "shared_member_settlement",
                severity: "high",
                organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
                counterpartyOrganizationId:
                  "66db7d46-54e0-4a0d-a1bd-7a2f0bf23e84",
                counterpartyOrganizationName: "Shared Provider",
                counterpartyOrganizationSlug: "shared-provider",
                reason: "Counterparty shares 1 member identity signal(s) with the scanned organization.",
                sharedMemberEmails: ["shared@example.com"],
                outgoingSettlementCount: 2,
                outgoingSettledUsd: "50.00",
                outgoingUsageEventCount: 0,
                outgoingUsageTotalTokens: 0,
                incomingSettlementCount: 0,
                incomingSettledUsd: "0.00",
                incomingUsageEventCount: 0,
                incomingUsageTotalTokens: 0,
                firstActivityAt: "2026-03-08T10:00:00.000Z",
                lastActivityAt: "2026-03-09T10:00:00.000Z"
              }
            ]
          }))
    } as unknown as GetFraudReviewAlertsUseCase,
    executeChatCompletionUseCase: { execute: unusedExecute },
    listPlacementCandidatesUseCase: {
      execute: unusedExecute
    } as unknown as ListPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase: {
      execute: unusedExecute
    } as unknown as ResolveSyncPlacementUseCase,
    enrollProviderNodeUseCase: {
      execute: unusedExecute
    } as unknown as EnrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase: {
      execute: unusedExecute
    } as unknown as RecordProviderBenchmarkUseCase,
    listProviderInventoryUseCase: {
      execute: unusedExecute
    } as unknown as ListProviderInventoryUseCase,
    getProviderNodeDetailUseCase: {
      execute: unusedExecute
    } as unknown as GetProviderNodeDetailUseCase,
    issueProviderNodeAttestationChallengeUseCase: { execute: unusedExecute },
    submitProviderNodeAttestationUseCase: { execute: unusedExecute },
    upsertProviderNodeRoutingProfileUseCase: {
      execute: unusedExecute
    } as unknown as UpsertProviderNodeRoutingProfileUseCase,
    listProviderBenchmarkHistoryUseCase: {
      execute: unusedExecute
    } as unknown as ListProviderBenchmarkHistoryUseCase,
    admitProviderRuntimeWorkloadBundleUseCase: { execute: unusedExecute }
  });
}

describe("risk routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("returns fraud review alerts", async () => {
    const app = buildRiskApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/risk/fraud-review-alerts?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45&lookbackDays=30"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      graph: {
        alertCount: 1
      },
      alerts: [
        {
          signalType: "shared_member_settlement"
        }
      ]
    });
  });

  it("maps missing organizations to 404", async () => {
    const app = buildRiskApp({
      getFraudReviewAlertsExecute: () =>
        Promise.reject(
          new FraudReviewOrganizationNotFoundError(
            "87057cb0-e0ca-4095-9f25-dd8103408b18"
          )
        )
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/risk/fraud-review-alerts?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps authorization failures to 403", async () => {
    const app = buildRiskApp({
      getFraudReviewAlertsExecute: () =>
        Promise.reject(new FraudReviewAuthorizationError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/risk/fraud-review-alerts?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps domain validation failures to 400", async () => {
    const app = buildRiskApp({
      getFraudReviewAlertsExecute: () =>
        Promise.reject(new DomainValidationError("bad input"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/risk/fraud-review-alerts?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid lookback days", async () => {
    const app = buildRiskApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/risk/fraud-review-alerts?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45&lookbackDays=120"
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid organization ids", async () => {
    const app = buildRiskApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/risk/fraud-review-alerts?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("surfaces unexpected failures as internal errors", async () => {
    const app = buildRiskApp({
      getFraudReviewAlertsExecute: () =>
        Promise.reject(new Error("unexpected failure"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/risk/fraud-review-alerts?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(500);
  });
});
