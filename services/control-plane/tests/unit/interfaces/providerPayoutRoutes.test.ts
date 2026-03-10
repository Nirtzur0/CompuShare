import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
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
import type { GetProviderPayoutAccountStatusUseCase } from "../../../src/application/payout/GetProviderPayoutAccountStatusUseCase.js";
import type { GetProviderPayoutAvailabilityUseCase } from "../../../src/application/payout/GetProviderPayoutAvailabilityUseCase.js";
import type { IssueProviderPayoutOnboardingLinkUseCase } from "../../../src/application/payout/IssueProviderPayoutOnboardingLinkUseCase.js";
import type { ProcessStripeConnectWebhookUseCase } from "../../../src/application/payout/ProcessStripeConnectWebhookUseCase.js";
import {
  ProviderCapabilityRequiredError,
  OrganizationFinanceAuthorizationError,
  LedgerOrganizationNotFoundError
} from "../../../src/application/ledger/LedgerErrors.js";
import {
  ProviderPayoutAccountNotFoundError,
  StripeWebhookSignatureVerificationError
} from "../../../src/application/payout/PayoutErrors.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import type { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function buildProviderPayoutApp(input?: {
  issueProviderPayoutOnboardingLinkExecute?: IssueProviderPayoutOnboardingLinkUseCase["execute"];
  getProviderPayoutAccountStatusExecute?: GetProviderPayoutAccountStatusUseCase["execute"];
  getProviderPayoutAvailabilityExecute?: GetProviderPayoutAvailabilityUseCase["execute"];
  processStripeConnectWebhookExecute?: ProcessStripeConnectWebhookUseCase["execute"];
}): FastifyInstance {
  const unusedExecute = () => Promise.reject(new Error("unused"));

  return buildApp({
    createOrganizationUseCase: {
      execute: unusedExecute
    } as unknown as CreateOrganizationUseCase,
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
    issueProviderPayoutOnboardingLinkUseCase: {
      execute:
        input?.issueProviderPayoutOnboardingLinkExecute ??
        (() =>
          Promise.resolve({
            accountId: "acct_1",
            onboardingUrl: "https://connect.stripe.test/onboarding",
            expiresAt: "2026-03-10T12:00:00.000Z"
          }))
    } as unknown as IssueProviderPayoutOnboardingLinkUseCase,
    getProviderPayoutAccountStatusUseCase: {
      execute:
        input?.getProviderPayoutAccountStatusExecute ??
        (() =>
          Promise.resolve({
            payoutAccount: {
              accountId: "acct_1",
              onboardingStatus: "pending",
              chargesEnabled: false,
              payoutsEnabled: false,
              detailsSubmitted: false,
              country: "US",
              defaultCurrency: "usd",
              requirementsCurrentlyDue: ["external_account"],
              requirementsEventuallyDue: [],
              lastStripeSyncAt: "2026-03-10T12:00:00.000Z"
            }
          }))
    } as unknown as GetProviderPayoutAccountStatusUseCase,
    getProviderPayoutAvailabilityUseCase: {
      execute:
        input?.getProviderPayoutAvailabilityExecute ??
        (() =>
          Promise.resolve({
            payoutAvailability: {
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              pendingEarningsUsd: "10.00",
              reserveHoldbackUsd: "1.00",
              withdrawableCashUsd: "9.00",
              eligiblePayoutUsd: "9.00",
              lastPayoutAt: null,
              lastPayoutStatus: "none"
            }
          }))
    } as unknown as GetProviderPayoutAvailabilityUseCase,
    processStripeConnectWebhookUseCase: {
      execute:
        input?.processStripeConnectWebhookExecute ??
        (() => Promise.resolve({ accepted: true }))
    } as unknown as ProcessStripeConnectWebhookUseCase,
    getConsumerDashboardOverviewUseCase: { execute: unusedExecute },
    getProviderDashboardOverviewUseCase: { execute: unusedExecute },
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

describe("provider payout routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("creates an onboarding link", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/onboarding-links",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      accountId: "acct_1"
    });
  });

  it("returns current payout account status", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/current?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payoutAccount: {
        accountId: "acct_1"
      }
    });
  });

  it("maps missing payout accounts to 404", async () => {
    const app = buildProviderPayoutApp({
      getProviderPayoutAccountStatusExecute: async () => {
        return await Promise.reject(
          new ProviderPayoutAccountNotFoundError(
            "87057cb0-e0ca-4095-9f25-dd8103408b18"
          )
        );
      }
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/current?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(404);
  });

  it("rejects invalid onboarding-link payloads", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/onboarding-links",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid organization ids for payout onboarding", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/finance/provider-payout-accounts/onboarding-links",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns provider payout availability", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-availability?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payoutAvailability: {
        eligiblePayoutUsd: "9.00"
      }
    });
  });

  it("maps provider-capability failures to 409 for payout onboarding", async () => {
    const app = buildProviderPayoutApp({
      issueProviderPayoutOnboardingLinkExecute: () =>
        Promise.reject(new ProviderCapabilityRequiredError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/onboarding-links",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_CAPABILITY_REQUIRED"
    });
  });

  it("maps finance authorization failures to 403 for payout account status", async () => {
    const app = buildProviderPayoutApp({
      getProviderPayoutAccountStatusExecute: () =>
        Promise.reject(new OrganizationFinanceAuthorizationError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/current?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR"
    });
  });

  it("maps provider capability failures to 409 for payout account status", async () => {
    const app = buildProviderPayoutApp({
      getProviderPayoutAccountStatusExecute: () =>
        Promise.reject(new ProviderCapabilityRequiredError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/current?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_CAPABILITY_REQUIRED"
    });
  });

  it("maps missing organizations to 404 for provider payout availability", async () => {
    const app = buildProviderPayoutApp({
      getProviderPayoutAvailabilityExecute: () =>
        Promise.reject(
          new LedgerOrganizationNotFoundError(
            "87057cb0-e0ca-4095-9f25-dd8103408b18"
          )
        )
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-availability?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "LEDGER_ORGANIZATION_NOT_FOUND"
    });
  });

  it("maps finance authorization failures to 403 for provider payout availability", async () => {
    const app = buildProviderPayoutApp({
      getProviderPayoutAvailabilityExecute: () =>
        Promise.reject(new OrganizationFinanceAuthorizationError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-availability?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR"
    });
  });

  it("maps payout onboarding domain validation errors to 400", async () => {
    const app = buildProviderPayoutApp({
      issueProviderPayoutOnboardingLinkExecute: () =>
        Promise.reject(new DomainValidationError("bad input"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/onboarding-links",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "DOMAIN_VALIDATION_ERROR"
    });
  });

  it("rejects invalid payout-account status queries", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-accounts/current?actorUserId=not-a-uuid"
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid payout-availability query params", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/provider-payout-availability?actorUserId=not-a-uuid"
    });

    expect(response.statusCode).toBe(400);
  });

  it("accepts a signed stripe webhook payload", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      headers: {
        "stripe-signature": "sig",
        "content-type": "application/json"
      },
      payload: "{}"
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

  it("accepts a signed stripe webhook payload when the parsed body is already a string", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      headers: {
        "stripe-signature": "sig",
        "content-type": "text/plain"
      },
      payload: "{}"
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ accepted: true });
  });

  it("rejects invalid stripe webhook signatures", async () => {
    const app = buildProviderPayoutApp({
      processStripeConnectWebhookExecute: async () => {
        return await Promise.reject(
          new StripeWebhookSignatureVerificationError()
        );
      }
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      headers: {
        "stripe-signature": "sig",
        "content-type": "application/json"
      },
      payload: "{}"
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects missing stripe webhook signatures", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      headers: {
        "content-type": "application/json"
      },
      payload: "{}"
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects signed stripe webhooks without a payload body", async () => {
    const app = buildProviderPayoutApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      headers: {
        "stripe-signature": "sig"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rethrows unexpected stripe webhook processing errors", async () => {
    const app = buildProviderPayoutApp({
      processStripeConnectWebhookExecute: () =>
        Promise.reject(new Error("unexpected webhook error"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/connect",
      headers: {
        "stripe-signature": "sig",
        "content-type": "application/json"
      },
      payload: "{}"
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      message: "unexpected webhook error"
    });
  });
});
