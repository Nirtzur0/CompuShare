import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  ConsumerDisputeDashboardAuthorizationError,
  ConsumerDisputeDashboardCapabilityRequiredError,
  ConsumerDisputeDashboardOrganizationNotFoundError,
} from "../../../src/application/dashboard/GetConsumerDisputeDashboardUseCase.js";
import {
  ProviderDisputeDashboardAuthorizationError,
  ProviderDisputeDashboardCapabilityRequiredError,
  ProviderDisputeDashboardOrganizationNotFoundError,
} from "../../../src/application/dashboard/GetProviderDisputeDashboardUseCase.js";
import type { ConsumerDisputeDashboardSnapshot } from "../../../src/domain/dashboard/ConsumerDisputeDashboard.js";
import type { ProviderDisputeDashboardSnapshot } from "../../../src/domain/dashboard/ProviderDisputeDashboard.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function buildDisputeDashboardApp(input: {
  getConsumerDisputeDashboardUseCase?: {
    execute: (input: {
      organizationId: string;
      actorUserId: string;
    }) => Promise<{ dashboard: ConsumerDisputeDashboardSnapshot }>;
  };
  getProviderDisputeDashboardUseCase?: {
    execute: (input: {
      organizationId: string;
      actorUserId: string;
    }) => Promise<{ dashboard: ProviderDisputeDashboardSnapshot }>;
  };
}): FastifyInstance {
  return buildApp({
    createOrganizationUseCase: {
      execute: () => Promise.reject(new Error("unused create path")),
    },
    issueOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused invitation path")),
    },
    acceptOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused accept path")),
    },
    updateOrganizationMemberRoleUseCase: {
      execute: () => Promise.reject(new Error("unused role path")),
    },
    issueOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused api key path")),
    },
    authenticateOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused auth path")),
    },
    recordCustomerChargeUseCase: {
      execute: () => Promise.reject(new Error("unused charge path")),
    },
    recordCompletedJobSettlementUseCase: {
      execute: () => Promise.reject(new Error("unused settlement path")),
    },
    getStagedPayoutExportUseCase: {
      execute: () => Promise.reject(new Error("unused payout export path")),
    },
    getOrganizationWalletSummaryUseCase: {
      execute: () => Promise.reject(new Error("unused wallet path")),
    },
    ...(input.getConsumerDisputeDashboardUseCase === undefined
      ? {}
      : {
          getConsumerDisputeDashboardUseCase:
            input.getConsumerDisputeDashboardUseCase,
        }),
    getConsumerDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused consumer overview path")),
    },
    getProviderDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused provider overview path")),
    },
    ...(input.getProviderDisputeDashboardUseCase === undefined
      ? {}
      : {
          getProviderDisputeDashboardUseCase:
            input.getProviderDisputeDashboardUseCase,
        }),
    executeChatCompletionUseCase: {
      execute: () => Promise.reject(new Error("unused gateway path")),
    },
    listPlacementCandidatesUseCase: {
      execute: () => Promise.reject(new Error("unused placement path")),
    },
    resolveSyncPlacementUseCase: {
      execute: () => Promise.reject(new Error("unused placement resolve path")),
    },
    enrollProviderNodeUseCase: {
      execute: () => Promise.reject(new Error("unused provider path")),
    },
    recordProviderBenchmarkUseCase: {
      execute: () => Promise.reject(new Error("unused benchmark path")),
    },
    listProviderInventoryUseCase: {
      execute: () => Promise.reject(new Error("unused inventory path")),
    },
    getProviderNodeDetailUseCase: {
      execute: () => Promise.reject(new Error("unused detail path")),
    },
    issueProviderNodeAttestationChallengeUseCase: {
      execute: () => Promise.reject(new Error("unused attestation path")),
    },
    submitProviderNodeAttestationUseCase: {
      execute: () => Promise.reject(new Error("unused attestation path")),
    },
    upsertProviderNodeRoutingProfileUseCase: {
      execute: () => Promise.reject(new Error("unused routing path")),
    },
    listProviderBenchmarkHistoryUseCase: {
      execute: () => Promise.reject(new Error("unused benchmark history path")),
    },
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () => Promise.reject(new Error("unused runtime admission path")),
    },
  });
}

describe("dispute dashboard routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("returns the buyer dispute dashboard snapshot", async () => {
    const app = buildDisputeDashboardApp({
      getConsumerDisputeDashboardUseCase: {
        execute: () =>
          Promise.resolve({
            dashboard: {
              organizationId: "buyer-org",
              actorRole: "finance",
              activeDisputeCount: 1,
              activeDisputeHoldUsd: "4.00",
              disputes: [],
            },
          }),
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/dashboard/consumer-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      dashboard: {
        activeDisputeCount: 1,
        activeDisputeHoldUsd: "4.00",
      },
    });
  });

  it("maps buyer dispute authorization failures", async () => {
    const app = buildDisputeDashboardApp({
      getConsumerDisputeDashboardUseCase: {
        execute: () => Promise.reject(new ConsumerDisputeDashboardAuthorizationError()),
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/dashboard/consumer-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
    });

    expect(response.statusCode).toBe(403);
  });

  it("returns 404 when the buyer dispute dashboard is not configured", async () => {
    const app = buildDisputeDashboardApp({});
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/dashboard/consumer-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "CONSUMER_DISPUTE_DASHBOARD_UNAVAILABLE",
      message: "Consumer dispute dashboard is not configured.",
    });
  });

  it("returns the provider dispute dashboard snapshot", async () => {
    const app = buildDisputeDashboardApp({
      getProviderDisputeDashboardUseCase: {
        execute: () =>
          Promise.resolve({
            dashboard: {
              organizationId: "provider-org",
              actorRole: "finance",
              activeDisputeCount: 1,
              activeDisputeHoldUsd: "2.50",
              recentLostDisputeCount90d: 1,
              disputes: [],
            },
          }),
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/10c81035-01c5-4ef4-b711-98e7d4a6b157/dashboard/provider-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      dashboard: {
        recentLostDisputeCount90d: 1,
      },
    });
  });

  it("returns 404 when the provider dispute dashboard is not configured", async () => {
    const app = buildDisputeDashboardApp({});
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/10c81035-01c5-4ef4-b711-98e7d4a6b157/dashboard/provider-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "PROVIDER_DISPUTE_DASHBOARD_UNAVAILABLE",
      message: "Provider dispute dashboard is not configured.",
    });
  });

  it("rejects invalid dispute dashboard params and queries with 400 validation errors", async () => {
    const app = buildDisputeDashboardApp({});
    apps.push(app);

    const invalidConsumer = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/dashboard/consumer-disputes?actorUserId=invalid-user",
    });
    const invalidProvider = await app.inject({
      method: "GET",
      url: "/v1/organizations/10c81035-01c5-4ef4-b711-98e7d4a6b157/dashboard/provider-disputes?actorUserId=invalid-user",
    });

    expect(invalidConsumer.statusCode).toBe(400);
    expect(invalidConsumer.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
    expect(invalidProvider.statusCode).toBe(400);
    expect(invalidProvider.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it.each([
    [new ConsumerDisputeDashboardOrganizationNotFoundError("org"), 404],
    [new ConsumerDisputeDashboardCapabilityRequiredError(), 403],
  ])(
    "maps dispute dashboard errors to HTTP responses",
    async (error, statusCode) => {
      const app = buildDisputeDashboardApp({
        getConsumerDisputeDashboardUseCase: {
          execute: () => Promise.reject(error),
        },
      });
      apps.push(app);

      const response = await app.inject({
        method: "GET",
        url: "/v1/organizations/2fbdbb74-a611-46c7-b0d0-cf9457fd1f5b/dashboard/consumer-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
      });

      expect(response.statusCode).toBe(statusCode);
    },
  );

  it.each([
    [new ProviderDisputeDashboardOrganizationNotFoundError("org"), 404],
    [new ProviderDisputeDashboardCapabilityRequiredError(), 403],
    [new ProviderDisputeDashboardAuthorizationError(), 403],
  ])(
    "maps provider dispute dashboard errors to HTTP responses",
    async (error, statusCode) => {
      const app = buildDisputeDashboardApp({
        getProviderDisputeDashboardUseCase: {
          execute: () => Promise.reject(error),
        },
      });
      apps.push(app);

      const response = await app.inject({
        method: "GET",
        url: "/v1/organizations/10c81035-01c5-4ef4-b711-98e7d4a6b157/dashboard/provider-disputes?actorUserId=d1fc42c9-f18b-4669-b8b7-9393c26d3c6f",
      });

      expect(response.statusCode).toBe(statusCode);
    },
  );
});
