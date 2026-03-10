import { describe, expect, it } from "vitest";
import {
  ConsumerDashboardAuthorizationError,
  ConsumerDashboardCapabilityRequiredError,
  ConsumerDashboardOrganizationNotFoundError,
  type GetConsumerDashboardOverviewResponse
} from "../../../src/application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import {
  ProviderDashboardAuthorizationError,
  ProviderDashboardCapabilityRequiredError,
  ProviderDashboardOrganizationNotFoundError,
  type GetProviderDashboardOverviewResponse
} from "../../../src/application/dashboard/GetProviderDashboardOverviewUseCase.js";
import {
  ProviderPricingSimulatorAuthorizationError,
  ProviderPricingSimulatorCapabilityRequiredError,
  ProviderPricingSimulatorOrganizationNotFoundError,
  type GetProviderPricingSimulatorResponse
} from "../../../src/application/dashboard/GetProviderPricingSimulatorUseCase.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function createApp(input: {
  getConsumerDashboardOverviewUseCase: {
    execute: (input: {
      organizationId: string;
      actorUserId: string;
    }) => Promise<GetConsumerDashboardOverviewResponse>;
  };
  getProviderDashboardOverviewUseCase: {
    execute: (input: {
      organizationId: string;
      actorUserId: string;
    }) => Promise<GetProviderDashboardOverviewResponse>;
  };
  getProviderPricingSimulatorUseCase?: {
    execute: (input: {
      organizationId: string;
      actorUserId: string;
    }) => Promise<GetProviderPricingSimulatorResponse>;
  };
}) {
  return buildApp({
    createOrganizationUseCase: {
      execute: () =>
        Promise.reject(new Error("unused create organization path"))
    },
    issueOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused invitation path"))
    },
    acceptOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused invitation accept path"))
    },
    updateOrganizationMemberRoleUseCase: {
      execute: () => Promise.reject(new Error("unused organization role path"))
    },
    issueOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused api key issue path"))
    },
    authenticateOrganizationApiKeyUseCase: {
      execute: () => Promise.reject(new Error("unused api key auth path"))
    },
    recordCustomerChargeUseCase: {
      execute: () => Promise.reject(new Error("unused finance charge path"))
    },
    recordCompletedJobSettlementUseCase: {
      execute: () => Promise.reject(new Error("unused finance settlement path"))
    },
    getStagedPayoutExportUseCase: {
      execute: () => Promise.reject(new Error("unused payout export path"))
    },
    getOrganizationWalletSummaryUseCase: {
      execute: () => Promise.reject(new Error("unused wallet summary path"))
    },
    getConsumerDashboardOverviewUseCase:
      input.getConsumerDashboardOverviewUseCase,
    getProviderDashboardOverviewUseCase:
      input.getProviderDashboardOverviewUseCase,
    ...(input.getProviderPricingSimulatorUseCase === undefined
      ? {}
      : {
          getProviderPricingSimulatorUseCase:
            input.getProviderPricingSimulatorUseCase
        }),
    executeChatCompletionUseCase: {
      execute: () => Promise.reject(new Error("unused gateway path"))
    },
    listPlacementCandidatesUseCase: {
      execute: () => Promise.reject(new Error("unused placement path"))
    },
    resolveSyncPlacementUseCase: {
      execute: () =>
        Promise.reject(new Error("unused sync placement resolution path"))
    },
    enrollProviderNodeUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider enrollment path"))
    },
    recordProviderBenchmarkUseCase: {
      execute: () => Promise.reject(new Error("unused provider benchmark path"))
    },
    listProviderInventoryUseCase: {
      execute: () => Promise.reject(new Error("unused provider inventory path"))
    },
    getProviderNodeDetailUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider node detail path"))
    },
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
    },
    listProviderBenchmarkHistoryUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider benchmark history path"))
    },
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider runtime admission path"))
    }
  });
}

describe("dashboard routes", () => {
  it("returns the provider dashboard overview", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.resolve({
            overview: {
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              actorRole: "finance",
              activeNodeCount: 2,
              healthSummary: {
                healthy: 1,
                degraded: 1,
                paused: 0
              },
              trustTierSummary: {
                community: 0,
                vetted: 1,
                attested: 1
              },
              balances: {
                organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
                usageBalanceUsd: "25.00",
                spendCreditsUsd: "5.00",
                pendingEarningsUsd: "11.25",
                withdrawableCashUsd: "7.75"
              },
              nodes: [],
              earningsTrend: [],
              estimatedUtilizationTrend: []
            }
          })
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      overview: {
        activeNodeCount: 2,
        actorRole: "finance",
        earningsTrend: [],
        estimatedUtilizationTrend: []
      }
    });
  });

  it("returns the provider pricing simulator snapshot", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },
      getProviderPricingSimulatorUseCase: {
        execute: () =>
          Promise.resolve({
            simulator: {
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              actorRole: "finance",
              simulatableNodeCount: 1,
              unavailableNodeCount: 1,
              assumptions: {
                usageObservationDays: 7,
                settlementEconomicsDays: 30,
                projectionDays: 30,
                netProjectionStatus: "available",
                settlementCount: 2,
                realizedPlatformFeePercent: 12,
                realizedReserveHoldbackPercent: 4,
                realizedWithdrawablePercent: 80
              },
              nodes: []
            }
          })
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-pricing-simulator?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      simulator: {
        simulatableNodeCount: 1,
        unavailableNodeCount: 1,
        assumptions: {
          netProjectionStatus: "available"
        }
      }
    });
  });

  it("returns 400 for invalid provider dashboard params", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/dashboard/provider-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("returns 400 for invalid provider dashboard query params", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-overview?actorUserId=not-a-uuid"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("maps missing dashboard organizations to 404", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(
            new ProviderDashboardOrganizationNotFoundError(
              "87057cb0-e0ca-4095-9f25-dd8103408b18"
            )
          )
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_DASHBOARD_ORGANIZATION_NOT_FOUND"
    });
  });

  it("maps provider capability failures to 403", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new ProviderDashboardCapabilityRequiredError())
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_DASHBOARD_CAPABILITY_REQUIRED"
    });
  });

  it("maps pricing simulator missing organizations to 404", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },
      getProviderPricingSimulatorUseCase: {
        execute: () =>
          Promise.reject(
            new ProviderPricingSimulatorOrganizationNotFoundError(
              "87057cb0-e0ca-4095-9f25-dd8103408b18"
            )
          )
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-pricing-simulator?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_PRICING_SIMULATOR_ORGANIZATION_NOT_FOUND"
    });
  });

  it("maps pricing simulator capability failures to 403", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },
      getProviderPricingSimulatorUseCase: {
        execute: () =>
          Promise.reject(new ProviderPricingSimulatorCapabilityRequiredError())
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-pricing-simulator?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_PRICING_SIMULATOR_CAPABILITY_REQUIRED"
    });
  });

  it("maps pricing simulator authorization failures to 403", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },
      getProviderPricingSimulatorUseCase: {
        execute: () =>
          Promise.reject(new ProviderPricingSimulatorAuthorizationError())
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-pricing-simulator?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_PRICING_SIMULATOR_AUTHORIZATION_ERROR"
    });
  });

  it("maps dashboard authorization failures to 403", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () => Promise.reject(new ProviderDashboardAuthorizationError())
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_DASHBOARD_AUTHORIZATION_ERROR"
    });
  });

  it("surfaces unexpected provider dashboard failures as 500", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () => Promise.reject(new Error("provider dashboard exploded"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/provider-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      error: "Internal Server Error"
    });
  });

  it("returns the consumer dashboard overview", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.resolve({
            overview: {
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              actorRole: "finance",
              spendSummary: {
                lifetimeFundedUsd: "100.00",
                lifetimeSettledSpendUsd: "50.00"
              },
              balances: {
                organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
                usageBalanceUsd: "50.00",
                spendCreditsUsd: "5.00",
                pendingEarningsUsd: "0.00",
                withdrawableCashUsd: "0.00"
              },
              usageTrend: [],
              latencyByModel: []
            }
          })
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/consumer-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      overview: {
        actorRole: "finance",
        spendSummary: {
          lifetimeFundedUsd: "100.00"
        },
        usageTrend: [],
        latencyByModel: []
      }
    });
  });

  it("maps missing consumer dashboard organizations to 404", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(
            new ConsumerDashboardOrganizationNotFoundError(
              "87057cb0-e0ca-4095-9f25-dd8103408b18"
            )
          )
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/consumer-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "CONSUMER_DASHBOARD_ORGANIZATION_NOT_FOUND"
    });
  });

  it("maps consumer capability failures to 403", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new ConsumerDashboardCapabilityRequiredError())
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/consumer-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "CONSUMER_DASHBOARD_CAPABILITY_REQUIRED"
    });
  });

  it("maps consumer dashboard authorization failures to 403", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () => Promise.reject(new ConsumerDashboardAuthorizationError())
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/consumer-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "CONSUMER_DASHBOARD_AUTHORIZATION_ERROR"
    });
  });

  it("surfaces unexpected consumer dashboard failures as 500", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () => Promise.reject(new Error("consumer dashboard exploded"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/consumer-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      error: "Internal Server Error"
    });
  });

  it("returns 400 for invalid consumer dashboard params", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/dashboard/consumer-overview?actorUserId=345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("returns 400 for invalid consumer dashboard query params", async () => {
    const app = createApp({
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/87057cb0-e0ca-4095-9f25-dd8103408b18/dashboard/consumer-overview?actorUserId=not-a-uuid"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });
});
