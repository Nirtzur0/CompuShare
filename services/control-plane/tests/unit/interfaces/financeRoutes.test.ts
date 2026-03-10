import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import type { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import {
  BuyerCapabilityRequiredError,
  LedgerInsufficientPrepaidBalanceError,
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError,
  ProviderCapabilityRequiredError
} from "../../../src/application/ledger/LedgerErrors.js";
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

function buildFinanceApp(
  recordCustomerChargeExecute: RecordCustomerChargeUseCase["execute"] = () =>
    Promise.reject(new Error("unused charge path")),
  recordCompletedJobSettlementExecute: RecordCompletedJobSettlementUseCase["execute"] = () =>
    Promise.reject(new Error("unused job settlement path")),
  getStagedPayoutExportExecute: GetStagedPayoutExportUseCase["execute"] = () =>
    Promise.reject(new Error("unused payout export path")),
  getWalletSummaryExecute: GetOrganizationWalletSummaryUseCase["execute"] = () =>
    Promise.reject(new Error("unused wallet path"))
): FastifyInstance {
  return buildApp({
    createOrganizationUseCase: {
      execute: () => Promise.reject(new Error("unused create path"))
    } as unknown as CreateOrganizationUseCase,
    issueOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused invitation path"))
    } as unknown as IssueOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused accept path"))
    } as unknown as AcceptOrganizationInvitationUseCase,
    updateOrganizationMemberRoleUseCase: {
      execute: () => Promise.reject(new Error("unused role path"))
    } as unknown as UpdateOrganizationMemberRoleUseCase,
    issueOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused api key path"))
    } as unknown as IssueOrganizationApiKeyUseCase,
    authenticateOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused auth path"))
    } as unknown as AuthenticateOrganizationApiKeyUseCase,
    recordCustomerChargeUseCase: {
      execute: recordCustomerChargeExecute
    } as unknown as RecordCustomerChargeUseCase,
    recordCompletedJobSettlementUseCase: {
      execute: recordCompletedJobSettlementExecute
    } as unknown as RecordCompletedJobSettlementUseCase,
    getStagedPayoutExportUseCase: {
      execute: getStagedPayoutExportExecute
    } as unknown as GetStagedPayoutExportUseCase,
    getOrganizationWalletSummaryUseCase: {
      execute: getWalletSummaryExecute
    } as unknown as GetOrganizationWalletSummaryUseCase,
    getConsumerDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused consumer dashboard path"))
    },
    listPlacementCandidatesUseCase: {
      execute: () => Promise.reject(new Error("unused placement path"))
    } as unknown as ListPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase: {
      execute: () => Promise.reject(new Error("unused placement resolve path"))
    } as unknown as ResolveSyncPlacementUseCase,
    enrollProviderNodeUseCase: {
      execute: () => Promise.reject(new Error("unused provider path"))
    } as unknown as EnrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase: {
      execute: () => Promise.reject(new Error("unused provider benchmark path"))
    } as unknown as RecordProviderBenchmarkUseCase,
    listProviderInventoryUseCase: {
      execute: () => Promise.reject(new Error("unused provider inventory path"))
    } as unknown as ListProviderInventoryUseCase,
    getProviderNodeDetailUseCase: {
      execute: () => Promise.reject(new Error("unused provider detail path"))
    } as unknown as GetProviderNodeDetailUseCase,
    issueProviderNodeAttestationChallengeUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider attestation challenge path"))
    },
    submitProviderNodeAttestationUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider attestation submit path"))
    },
    upsertProviderNodeRoutingProfileUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider routing profile path"))
    } as unknown as UpsertProviderNodeRoutingProfileUseCase,
    listProviderBenchmarkHistoryUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider benchmark history path"))
    } as unknown as ListProviderBenchmarkHistoryUseCase,
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () => Promise.reject(new Error("unused runtime admission path"))
    },
    getProviderDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused provider dashboard path"))
    },
    executeChatCompletionUseCase: {
      execute: () => Promise.reject(new Error("unused gateway path"))
    }
  });
}

describe("finance routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("records a customer charge", async () => {
    const app = buildFinanceApp(() =>
      Promise.resolve({
        transaction: {
          id: "7df5f37d-8a43-4d12-9b0d-b28bb8f54217",
          organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
          transactionType: "customer_charge",
          reference: "stripe_pi_123",
          createdByUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
          occurredAt: "2026-03-09T12:00:00.000Z",
          postings: [
            {
              accountCode: "platform_cash_clearing",
              direction: "debit",
              amountUsd: "25.00",
              organizationId: null
            },
            {
              accountCode: "customer_prepaid_cash_liability",
              direction: "credit",
              amountUsd: "25.00",
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
            }
          ]
        },
        walletSummary: {
          organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
          usageBalanceUsd: "25.00",
          spendCreditsUsd: "0.00",
          pendingEarningsUsd: "0.00",
          withdrawableCashUsd: "0.00"
        }
      })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/customer-charges",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      walletSummary: {
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      }
    });
  });

  it("maps finance authorization failures to 403", async () => {
    const app = buildFinanceApp(() =>
      Promise.reject(new OrganizationFinanceAuthorizationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/customer-charges",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
      message:
        "Only owner, admin, or finance members may manage organization finances."
    });
  });

  it("maps buyer capability failures to 403", async () => {
    const app = buildFinanceApp(() =>
      Promise.reject(new BuyerCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/customer-charges",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "BUYER_CAPABILITY_REQUIRED",
      message:
        "Organization must have buyer capability before recording charges."
    });
  });

  it("maps missing organizations to 404", async () => {
    const app = buildFinanceApp(() =>
      Promise.reject(new LedgerOrganizationNotFoundError("org-123"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/customer-charges",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 400 for invalid customer charge requests", async () => {
    const app = buildFinanceApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/finance/customer-charges",
      payload: {
        actorUserId: "not-a-uuid",
        amountUsd: "25.000",
        paymentReference: "x"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid customer charge bodies with valid params", async () => {
    const app = buildFinanceApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/customer-charges",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        amountUsd: "25.000",
        paymentReference: "x"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps domain validation failures to 400", async () => {
    const app = buildFinanceApp(() =>
      Promise.reject(new DomainValidationError("Bad charge request."))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/customer-charges",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad charge request."
    });
  });

  it("rethrows unexpected customer charge errors as 500 responses", async () => {
    const app = buildFinanceApp(() => Promise.reject(new Error("boom")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/customer-charges",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(response.statusCode).toBe(500);
  });

  it("records a completed-job settlement", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () =>
        Promise.resolve({
          transaction: {
            id: "9ec9861b-3eba-48d3-b6ac-f34f546c8c10",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            transactionType: "job_settlement",
            reference: "job_0001",
            createdByUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
            occurredAt: "2026-03-09T12:30:00.000Z",
            postings: [
              {
                accountCode: "customer_prepaid_cash_liability",
                direction: "debit",
                amountUsd: "10.00",
                organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
              },
              {
                accountCode: "provider_payable",
                direction: "credit",
                amountUsd: "8.50",
                organizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35"
              },
              {
                accountCode: "platform_revenue",
                direction: "credit",
                amountUsd: "1.20",
                organizationId: null
              },
              {
                accountCode: "risk_reserve",
                direction: "credit",
                amountUsd: "0.30",
                organizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35"
              }
            ]
          },
          walletSummary: {
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            usageBalanceUsd: "15.00",
            spendCreditsUsd: "0.00",
            pendingEarningsUsd: "0.00",
            withdrawableCashUsd: "0.00"
          }
        }),
      () => Promise.reject(new Error("unused payout export path")),
      () => Promise.reject(new Error("unused wallet path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      walletSummary: {
        usageBalanceUsd: "15.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      }
    });
  });

  it("maps provider capability failures on settlement to 409", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new ProviderCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "PROVIDER_CAPABILITY_REQUIRED",
      message:
        "Organization must have provider capability before receiving settled earnings."
    });
  });

  it("maps buyer capability failures on settlement to 403", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new BuyerCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "BUYER_CAPABILITY_REQUIRED",
      message:
        "Organization must have buyer capability before recording charges."
    });
  });

  it("maps finance authorization failures on settlement to 403", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new OrganizationFinanceAuthorizationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
      message:
        "Only owner, admin, or finance members may manage organization finances."
    });
  });

  it("maps missing organizations on settlement to 404", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new LedgerOrganizationNotFoundError("org-123"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps insufficient prepaid balance failures on settlement to 409", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () =>
        Promise.reject(
          new LedgerInsufficientPrepaidBalanceError("10.00", "5.00")
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "LEDGER_INSUFFICIENT_PREPAID_BALANCE",
      message: "Settlement amount 10.00 exceeds available prepaid balance 5.00."
    });
  });

  it("returns 400 for invalid job settlement requests", async () => {
    const app = buildFinanceApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/finance/job-settlements",
      payload: {
        actorUserId: "not-a-uuid",
        providerOrganizationId: "not-a-uuid",
        providerPayableUsd: "8.500",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "x"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps settlement domain validation failures to 400", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new DomainValidationError("Bad settlement request."))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad settlement request."
    });
  });

  it("rethrows unexpected settlement errors as 500 responses", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("boom"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/job-settlements",
      payload: {
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(response.statusCode).toBe(500);
  });

  it("returns an organization wallet summary", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("unused job settlement path")),
      () => Promise.reject(new Error("unused payout export path")),
      () =>
        Promise.resolve({
          walletSummary: {
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            usageBalanceUsd: "25.00",
            spendCreditsUsd: "3.00",
            pendingEarningsUsd: "8.50",
            withdrawableCashUsd: "5.50"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/wallet?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      walletSummary: {
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "3.00",
        pendingEarningsUsd: "8.50",
        withdrawableCashUsd: "5.50"
      }
    });
  });

  it("requires actorUserId when reading wallet summaries", async () => {
    const app = buildFinanceApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/wallet"
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps wallet summary authorization failures to 403", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("unused job settlement path")),
      () => Promise.reject(new Error("unused payout export path")),
      () => Promise.reject(new OrganizationFinanceAuthorizationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/wallet?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
      message:
        "Only owner, admin, or finance members may manage organization finances."
    });
  });

  it("maps missing organizations on wallet reads to 404", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("unused job settlement path")),
      () => Promise.reject(new Error("unused payout export path")),
      () =>
        Promise.reject(
          new LedgerOrganizationNotFoundError(
            "87057cb0-e0ca-4095-9f25-dd8103408b18"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/wallet?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps wallet summary domain errors to 400", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("unused job settlement path")),
      () => Promise.reject(new Error("unused payout export path")),
      () => Promise.reject(new DomainValidationError("Bad wallet request."))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/wallet?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad wallet request."
    });
  });

  it("rethrows unexpected wallet summary errors as 500 responses", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("unused job settlement path")),
      () => Promise.reject(new Error("unused payout export path")),
      () => Promise.reject(new Error("boom"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/wallet?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(500);
  });

  it("returns 400 for invalid wallet summary params", async () => {
    const app = buildFinanceApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/finance/wallet?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns a staged payout export", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("unused job settlement path")),
      () =>
        Promise.resolve({
          payoutExport: {
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            entries: [
              {
                providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
                settlementReference: "job_0001",
                providerPayableUsd: "8.50",
                reserveHoldbackUsd: "0.30",
                withdrawableCashUsd: "8.20"
              }
            ]
          }
        }),
      () => Promise.reject(new Error("unused wallet path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/payout-exports/staged?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      payoutExport: {
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        entries: [
          {
            providerOrganizationId: "27d34bb3-aa58-4d66-a6a9-930706c29c35",
            settlementReference: "job_0001",
            providerPayableUsd: "8.50",
            reserveHoldbackUsd: "0.30",
            withdrawableCashUsd: "8.20"
          }
        ]
      }
    });
  });

  it("maps payout export authorization failures to 403", async () => {
    const app = buildFinanceApp(
      () => Promise.reject(new Error("unused charge path")),
      () => Promise.reject(new Error("unused job settlement path")),
      () => Promise.reject(new OrganizationFinanceAuthorizationError()),
      () => Promise.reject(new Error("unused wallet path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/finance/payout-exports/staged?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(403);
  });

  it("returns 400 for invalid payout export params", async () => {
    const app = buildFinanceApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/finance/payout-exports/staged?actorUserId=97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.statusCode).toBe(400);
  });
});
