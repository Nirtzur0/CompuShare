import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import type { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type {
  CreateProviderDisputeRequest,
} from "../../../src/application/dispute/CreateProviderDisputeUseCase.js";
import type {
  ListProviderDisputesRequest,
} from "../../../src/application/dispute/ListProviderDisputesUseCase.js";
import type {
  RecordProviderDisputeAllocationsRequest,
} from "../../../src/application/dispute/RecordProviderDisputeAllocationsUseCase.js";
import type {
  TransitionProviderDisputeStatusRequest,
} from "../../../src/application/dispute/TransitionProviderDisputeStatusUseCase.js";
import {
  ProviderDisputeAuthorizationError,
  ProviderDisputeBuyerCapabilityRequiredError,
  ProviderDisputeCaseNotFoundError,
  ProviderDisputeOrganizationNotFoundError,
  ProviderDisputePaymentReferenceNotFoundError,
  ProviderDisputeProviderCapabilityRequiredError,
  ProviderDisputeSettlementNotFoundError,
} from "../../../src/application/dispute/ProviderDisputeErrors.js";
import type { ProviderDisputeCaseSnapshot } from "../../../src/domain/dispute/ProviderDisputeCase.js";
import type { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function createSnapshot(input: {
  id: string;
  disputeType: "settlement" | "chargeback";
  status: "open" | "under_review" | "won" | "lost" | "recovered" | "canceled";
}): ProviderDisputeCaseSnapshot {
  return {
    id: input.id,
    buyerOrganizationId: "2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b",
    createdByUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
    disputeType: input.disputeType,
    source: "manual",
    status: input.status,
    paymentReference: input.disputeType === "chargeback" ? "stripe_pi_001" : null,
    jobReference: input.disputeType === "settlement" ? "job_001" : null,
    disputedAmountUsd: "4.00",
    reasonCode: "quality_miss",
    summary: "Provider missed latency target.",
    stripeDisputeId: null,
    stripeChargeId: null,
    stripeReason: null,
    stripeStatus: null,
    createdAt: "2026-03-10T12:00:00.000Z",
    updatedAt: "2026-03-10T12:00:00.000Z",
    resolvedAt: null,
    evidenceEntries: [
      {
        label: "log_excerpt",
        value: "p95 latency exceeded the buyer-approved SLA window",
      },
    ],
    allocations: [
      {
        providerOrganizationId: "10c81035-01c5-4ef4-b711-98e7d4a6b157",
        amountUsd: "4.00",
      },
    ],
  };
}

function buildDisputeApp(input: {
  createProviderDisputeExecute?: (
    input: CreateProviderDisputeRequest,
  ) => Promise<{ dispute: ProviderDisputeCaseSnapshot }>;
  listProviderDisputesExecute?: (
    input: ListProviderDisputesRequest,
  ) => Promise<{ disputes: ProviderDisputeCaseSnapshot[] }>;
  recordAllocationsExecute?: (
    input: RecordProviderDisputeAllocationsRequest,
  ) => Promise<{ dispute: ProviderDisputeCaseSnapshot }>;
  transitionStatusExecute?: (
    input: TransitionProviderDisputeStatusRequest,
  ) => Promise<{ dispute: ProviderDisputeCaseSnapshot }>;
}): FastifyInstance {
  const createProviderDisputeExecute =
    input.createProviderDisputeExecute ??
    (() => Promise.reject(new Error("unused create dispute path")));
  const listProviderDisputesExecute =
    input.listProviderDisputesExecute ??
    (() => Promise.reject(new Error("unused list dispute path")));
  const recordAllocationsExecute =
    input.recordAllocationsExecute ??
    (() => Promise.reject(new Error("unused allocation path")));
  const transitionStatusExecute =
    input.transitionStatusExecute ??
    (() => Promise.reject(new Error("unused transition path")));

  return buildApp({
    createOrganizationUseCase: {
      execute: () => Promise.reject(new Error("unused create path")),
    } as unknown as CreateOrganizationUseCase,
    issueOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused invitation path")),
    } as unknown as IssueOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused accept path")),
    } as unknown as AcceptOrganizationInvitationUseCase,
    updateOrganizationMemberRoleUseCase: {
      execute: () => Promise.reject(new Error("unused role path")),
    } as unknown as UpdateOrganizationMemberRoleUseCase,
    issueOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused api key path")),
    } as unknown as IssueOrganizationApiKeyUseCase,
    authenticateOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused auth path")),
    } as unknown as AuthenticateOrganizationApiKeyUseCase,
    recordCustomerChargeUseCase: {
      execute: () => Promise.reject(new Error("unused finance charge path")),
    },
    recordCompletedJobSettlementUseCase: {
      execute: () => Promise.reject(new Error("unused finance settlement path")),
    },
    getStagedPayoutExportUseCase: {
      execute: () => Promise.reject(new Error("unused payout export path")),
    },
    getOrganizationWalletSummaryUseCase: {
      execute: () => Promise.reject(new Error("unused wallet summary path")),
    },
    createProviderDisputeUseCase: {
      execute: createProviderDisputeExecute,
    },
    listProviderDisputesUseCase: {
      execute: listProviderDisputesExecute,
    },
    recordProviderDisputeAllocationsUseCase: {
      execute: recordAllocationsExecute,
    },
    transitionProviderDisputeStatusUseCase: {
      execute: transitionStatusExecute,
    },
    getConsumerDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused consumer dashboard path")),
    },
    getProviderDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused provider dashboard path")),
    },
    listPlacementCandidatesUseCase: {
      execute: () => Promise.reject(new Error("unused placement path")),
    } as unknown as ListPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase: {
      execute: () => Promise.reject(new Error("unused placement resolve path")),
    } as unknown as ResolveSyncPlacementUseCase,
    enrollProviderNodeUseCase: {
      execute: () => Promise.reject(new Error("unused provider path")),
    } as unknown as EnrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase: {
      execute: () => Promise.reject(new Error("unused benchmark path")),
    } as unknown as RecordProviderBenchmarkUseCase,
    listProviderInventoryUseCase: {
      execute: () => Promise.reject(new Error("unused inventory path")),
    } as unknown as ListProviderInventoryUseCase,
    getProviderNodeDetailUseCase: {
      execute: () => Promise.reject(new Error("unused detail path")),
    } as unknown as GetProviderNodeDetailUseCase,
    issueProviderNodeAttestationChallengeUseCase: {
      execute: () => Promise.reject(new Error("unused attestation path")),
    },
    submitProviderNodeAttestationUseCase: {
      execute: () => Promise.reject(new Error("unused attestation path")),
    },
    upsertProviderNodeRoutingProfileUseCase: {
      execute: () => Promise.reject(new Error("unused routing profile path")),
    } as unknown as UpsertProviderNodeRoutingProfileUseCase,
    listProviderBenchmarkHistoryUseCase: {
      execute: () => Promise.reject(new Error("unused benchmark history path")),
    } as unknown as ListProviderBenchmarkHistoryUseCase,
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () => Promise.reject(new Error("unused runtime admission path")),
    },
    executeChatCompletionUseCase: {
      execute: () => Promise.reject(new Error("unused gateway path")),
    },
  });
}

describe("provider dispute finance routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
    vi.restoreAllMocks();
  });

  it("creates settlement disputes", async () => {
    const execute = vi.fn(() =>
      Promise.resolve({
        dispute: createSnapshot({
          id: "df7f30e6-af6d-4a43-ac52-8db9f537ef06",
          disputeType: "settlement",
          status: "open",
        }),
      }),
    );
    const app = buildDisputeApp({
      createProviderDisputeExecute: execute,
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes",
      payload: {
        actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
        disputeType: "settlement",
        providerOrganizationId: "10c81035-01c5-4ef4-b711-98e7d4a6b157",
        jobReference: "job_001",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: "Provider missed latency target.",
        evidenceEntries: [
          {
            label: "log_excerpt",
            value: "p95 latency exceeded the buyer-approved SLA window",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(execute).toHaveBeenCalledWith({
      organizationId: "2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b",
      actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
      disputeType: "settlement",
      providerOrganizationId: "10c81035-01c5-4ef4-b711-98e7d4a6b157",
      jobReference: "job_001",
      disputedAmountUsd: "4.00",
      reasonCode: "quality_miss",
      summary: "Provider missed latency target.",
      evidenceEntries: [
        {
          label: "log_excerpt",
          value: "p95 latency exceeded the buyer-approved SLA window",
        },
      ],
    });
  });

  it("lists disputes with an optional status filter", async () => {
    const execute = vi.fn(() =>
      Promise.resolve({
        disputes: [createSnapshot({
          id: "df7f30e6-af6d-4a43-ac52-8db9f537ef06",
          disputeType: "settlement",
          status: "lost",
        })],
      }),
    );
    const app = buildDisputeApp({
      listProviderDisputesExecute: execute,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f&status=lost",
    });

    expect(response.statusCode).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      organizationId: "2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b",
      actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
      status: "lost",
    });
  });

  it("maps missing disputes to 404 on allocation updates", async () => {
    const app = buildDisputeApp({
      recordAllocationsExecute: () =>
        Promise.reject(
          new ProviderDisputeCaseNotFoundError(
            "df7f30e6-af6d-4a43-ac52-8db9f537ef06",
          ),
        ),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes/df7f30e6-af6d-4a43-ac52-8db9f537ef06/allocations",
      payload: {
        actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
        allocations: [
          {
            providerOrganizationId: "10c81035-01c5-4ef4-b711-98e7d4a6b157",
            amountUsd: "2.50",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "PROVIDER_DISPUTE_CASE_NOT_FOUND",
      message:
        'Provider dispute "df7f30e6-af6d-4a43-ac52-8db9f537ef06" was not found.',
    });
  });

  it("maps dispute authorization failures to 403 on status transitions", async () => {
    const app = buildDisputeApp({
      transitionStatusExecute: () =>
        Promise.reject(new ProviderDisputeAuthorizationError()),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes/df7f30e6-af6d-4a43-ac52-8db9f537ef06/status",
      payload: {
        actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
        nextStatus: "lost",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "PROVIDER_DISPUTE_AUTHORIZATION_ERROR",
      message: "Only owner, admin, or finance members may manage disputes.",
    });
  });

  it("rejects invalid dispute payloads and list filters with 400 validation errors", async () => {
    const app = buildDisputeApp({});
    apps.push(app);

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes",
      payload: {
        actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
        disputeType: "settlement",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: "Provider missed latency target.",
        evidenceEntries: [],
      },
    });
    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f&status=invalid",
    });

    expect(createResponse.statusCode).toBe(400);
    expect(createResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
    expect(listResponse.statusCode).toBe(400);
    expect(listResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("rejects invalid dispute params and allocation/status payloads with 400 validation errors", async () => {
    const app = buildDisputeApp({});
    apps.push(app);

    const allocationResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/finance/provider-disputes/df7f30e6-af6d-4a43-ac52-8db9f537ef06/allocations",
      payload: {
        actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
        allocations: [],
      },
    });
    const statusResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes/not-a-uuid/status",
      payload: {
        actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
        nextStatus: "invalid",
      },
    });

    expect(allocationResponse.statusCode).toBe(400);
    expect(allocationResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
    expect(statusResponse.statusCode).toBe(400);
    expect(statusResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("maps dispute organization lookup failures to 404 responses", async () => {
    const app = buildDisputeApp({
      listProviderDisputesExecute: () =>
        Promise.reject(
          new ProviderDisputeOrganizationNotFoundError(
            "2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b",
          ),
        ),
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "PROVIDER_DISPUTE_ORGANIZATION_NOT_FOUND",
      message:
        'Organization "2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b" was not found.',
    });
  });

  it.each([
    [
      new ProviderDisputeBuyerCapabilityRequiredError(),
      403,
      "PROVIDER_DISPUTE_BUYER_CAPABILITY_REQUIRED",
    ],
    [
      new ProviderDisputeProviderCapabilityRequiredError(),
      409,
      "PROVIDER_DISPUTE_PROVIDER_CAPABILITY_REQUIRED",
    ],
    [
      new ProviderDisputePaymentReferenceNotFoundError("stripe_pi_001"),
      404,
      "PROVIDER_DISPUTE_PAYMENT_REFERENCE_NOT_FOUND",
    ],
    [
      new ProviderDisputeSettlementNotFoundError("job_001"),
      404,
      "PROVIDER_DISPUTE_SETTLEMENT_NOT_FOUND",
    ],
  ])(
    "maps create-path dispute errors to the expected finance responses",
    async (error, statusCode, errorCode) => {
      const app = buildDisputeApp({
        createProviderDisputeExecute: () => Promise.reject(error),
      });
      apps.push(app);

      const response = await app.inject({
        method: "POST",
        url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/finance/provider-disputes",
        payload: {
          actorUserId: "d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
          disputeType: "chargeback",
          paymentReference: "stripe_pi_001",
          disputedAmountUsd: "6.00",
          reasonCode: "fraudulent",
          summary: "Issuer marked the charge as fraudulent.",
          evidenceEntries: [
            {
              label: "issuer_note",
              value: "Cardholder claims unauthorized use.",
            },
          ],
        },
      });

      expect(response.statusCode).toBe(statusCode);
      expect(response.json()).toMatchObject({
        error: errorCode,
        message: error.message,
      });
    },
  );
});
