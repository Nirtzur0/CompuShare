import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError,
  type AuthenticateOrganizationApiKeyUseCase
} from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import {
  PlacementBuyerCapabilityRequiredError,
  PlacementOrganizationNotFoundError
} from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import {
  NoEligiblePlacementCandidateError,
  SyncPlacementBuyerCapabilityRequiredError,
  SyncPlacementOrganizationNotFoundError
} from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function buildPlacementApp(
  execute: ListPlacementCandidatesUseCase["execute"],
  resolveExecute: ResolveSyncPlacementUseCase["execute"] = () =>
    Promise.reject(new Error("unused placement resolve path")),
  authenticateExecute: AuthenticateOrganizationApiKeyUseCase["execute"] = () =>
    Promise.reject(new Error("unused auth path"))
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
      execute: authenticateExecute
    } as unknown as AuthenticateOrganizationApiKeyUseCase,
    listPlacementCandidatesUseCase: {
      execute
    } as unknown as ListPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase: {
      execute: resolveExecute
    } as unknown as ResolveSyncPlacementUseCase,
    enrollProviderNodeUseCase: {
      execute: () => Promise.reject(new Error("unused enroll path"))
    } as unknown as EnrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase: {
      execute: () => Promise.reject(new Error("unused benchmark path"))
    } as unknown as RecordProviderBenchmarkUseCase,
    listProviderInventoryUseCase: {
      execute: () => Promise.reject(new Error("unused inventory path"))
    } as unknown as ListProviderInventoryUseCase,
    getProviderNodeDetailUseCase: {
      execute: () => Promise.reject(new Error("unused detail path"))
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
      execute: () => Promise.reject(new Error("unused routing path"))
    } as unknown as UpsertProviderNodeRoutingProfileUseCase,
    listProviderBenchmarkHistoryUseCase: {
      execute: () => Promise.reject(new Error("unused history path"))
    } as unknown as ListProviderBenchmarkHistoryUseCase,
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () => Promise.reject(new Error("unused runtime admission path"))
    },
    recordCustomerChargeUseCase: {
      execute: () => Promise.reject(new Error("unused finance charge path"))
    },

    recordCompletedJobSettlementUseCase: {
      execute: () => Promise.reject(new Error("unused finance settlement path"))
    },

    getStagedPayoutExportUseCase: {
      execute: () =>
        Promise.reject(new Error("unused finance payout export path"))
    },

    getOrganizationWalletSummaryUseCase: {
      execute: () => Promise.reject(new Error("unused finance wallet path"))
    },
    getConsumerDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused consumer dashboard path"))
    },
    getProviderDashboardOverviewUseCase: {
      execute: () => Promise.reject(new Error("unused provider dashboard path"))
    },

    executeChatCompletionUseCase: {
      execute: () => Promise.reject(new Error("unused gateway chat path"))
    }
  });
}

describe("placement routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("lists placement candidates for a scoped buyer request", async () => {
    const requests: unknown[] = [];
    const app = buildPlacementApp(
      (request) => {
        requests.push(request);

        return Promise.resolve({
          candidates: [
            {
              providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
              providerOrganizationId: "938fbcc1-d9f2-4943-a4e7-132d11136e14",
              providerNodeLabel: "Matched Node",
              region: "eu-central-1",
              trustTier: "t1_vetted",
              priceFloorUsdPerHour: 5.25,
              score: 84.61,
              scoreBreakdown: {
                pricePerformanceScore: 73.57,
                warmCacheMultiplier: 1.15,
                disputePenaltyMultiplier: 1,
                lostDisputeCount90d: 0,
                benchmarkThroughputTokensPerSecond: 742.5,
                priceFloorUsdPerHour: 5.25
              },
              warmCache: {
                matched: true,
                expiresAt: "2026-03-09T20:10:00.000Z"
              },
              matchedGpu: {
                model: "NVIDIA A100",
                vramGb: 80,
                count: 4,
                interconnect: "nvlink"
              },
              latestBenchmark: {
                id: "8103f4af-fdd1-44fd-b2a0-a7d6106db1d9",
                providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
                gpuClass: "NVIDIA A100",
                vramGb: 80,
                throughputTokensPerSecond: 742.5,
                driverVersion: "550.54.14",
                recordedAt: "2026-03-09T20:00:00.000Z"
              }
            }
          ]
        });
      },
      undefined,
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5,
        approvedModelAlias: "openai/gpt-oss-120b-like"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      candidates: [
        {
          providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
          priceFloorUsdPerHour: 5.25,
          warmCache: {
            matched: true
          }
        }
      ]
    });
    expect(requests).toEqual([
      {
        organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5,
        approvedModelAlias: "openai/gpt-oss-120b-like"
      }
    ]);
  });

  it("requires an API key header", async () => {
    const app = buildPlacementApp(() => Promise.resolve({ candidates: [] }));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid placement preview input", async () => {
    const app = buildPlacementApp(() => Promise.resolve({ candidates: [] }));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/environments/qa/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "A",
        minVramGb: 0,
        region: "",
        minimumTrustTier: "bad-tier",
        maxPriceUsdPerHour: 0
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid placement preview bodies with valid params", async () => {
    const app = buildPlacementApp(() => Promise.resolve({ candidates: [] }));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t3_invalid"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps buyer capability failures to 403", async () => {
    const app = buildPlacementApp(
      () => Promise.reject(new PlacementBuyerCapabilityRequiredError()),
      undefined,
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "PLACEMENT_BUYER_CAPABILITY_REQUIRED",
      message:
        "Organization must have buyer capability before previewing placement candidates."
    });
  });

  it("maps missing placement organizations to 404", async () => {
    const app = buildPlacementApp(
      () =>
        Promise.reject(
          new PlacementOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        ),
      undefined,
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps api key scope and authentication errors", async () => {
    const scopeMismatchApp = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      undefined,
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError())
    );
    const authErrorApp = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      undefined,
      () => Promise.reject(new OrganizationApiKeyAuthenticationError())
    );
    apps.push(scopeMismatchApp, authErrorApp);

    const scopeMismatchResponse = await scopeMismatchApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });
    const authErrorResponse = await authErrorApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(scopeMismatchResponse.statusCode).toBe(403);
    expect(authErrorResponse.statusCode).toBe(401);
  });

  it("maps domain validation errors to 400", async () => {
    const app = buildPlacementApp(
      () => Promise.reject(new DomainValidationError("Bad region.")),
      undefined,
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rethrows unexpected placement errors as 500 responses", async () => {
    const app = buildPlacementApp(
      () => Promise.reject(new Error("boom")),
      undefined,
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placement-candidates/preview",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(response.statusCode).toBe(500);
  });

  it("resolves a sync placement request to one selected endpoint", async () => {
    const app = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      () =>
        Promise.resolve({
          decisionLogId: "85d34bb0-35b5-4982-b4f3-b8f05d033fb3",
          candidateCount: 2,
          selection: {
            providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
            providerOrganizationId: "938fbcc1-d9f2-4943-a4e7-132d11136e14",
            providerNodeLabel: "Matched Node",
            endpointUrl: "https://matched-node.example.com/v1/chat/completions",
            region: "eu-central-1",
            trustTier: "t1_vetted",
            priceFloorUsdPerHour: 5.25,
            matchedGpu: {
              model: "NVIDIA A100",
              vramGb: 80,
              count: 4,
              interconnect: "nvlink"
            },
            latestBenchmark: null
          }
        }),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placements/sync",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      decisionLogId: "85d34bb0-35b5-4982-b4f3-b8f05d033fb3",
      candidateCount: 2,
      selection: {
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        endpointUrl: "https://matched-node.example.com/v1/chat/completions"
      }
    });
  });

  it("maps no-match sync placement outcomes to 404", async () => {
    const app = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      () => Promise.reject(new NoEligiblePlacementCandidateError()),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placements/sync",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "NO_ELIGIBLE_PLACEMENT_CANDIDATE",
      message:
        "No eligible provider node matched the requested placement constraints."
    });
  });

  it("maps sync placement buyer capability and organization failures", async () => {
    const capabilityApp = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      () => Promise.reject(new SyncPlacementBuyerCapabilityRequiredError()),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    const orgMissingApp = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      () =>
        Promise.reject(
          new SyncPlacementOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        ),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(capabilityApp, orgMissingApp);

    const capabilityResponse = await capabilityApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placements/sync",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });
    const orgMissingResponse = await orgMissingApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placements/sync",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(capabilityResponse.statusCode).toBe(403);
    expect(orgMissingResponse.statusCode).toBe(404);
  });

  it("forwards approved model aliases during sync placement", async () => {
    const requests: unknown[] = [];
    const app = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      (request) => {
        requests.push(request);

        return Promise.resolve({
          decisionLogId: "240f21c5-6a71-4e68-9dbb-b93a663f679c",
          candidateCount: 1,
          selection: {
            providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
            providerOrganizationId: "938fbcc1-d9f2-4943-a4e7-132d11136e14",
            providerNodeLabel: "Matched Node",
            endpointUrl: "https://provider.example.com/v1/chat/completions",
            region: "eu-central-1",
            trustTier: "t1_vetted",
            priceFloorUsdPerHour: 5.25,
            score: 84.61,
            scoreBreakdown: {
              pricePerformanceScore: 73.57,
              warmCacheMultiplier: 1.15,
              disputePenaltyMultiplier: 1,
              lostDisputeCount90d: 0,
              benchmarkThroughputTokensPerSecond: 742.5,
              priceFloorUsdPerHour: 5.25
            },
            warmCache: {
              matched: true,
              expiresAt: "2026-03-09T20:10:00.000Z"
            },
            matchedGpu: {
              model: "NVIDIA A100",
              vramGb: 80,
              count: 4,
              interconnect: "nvlink"
            },
            latestBenchmark: null
          }
        });
      },
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placements/sync",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5,
        approvedModelAlias: "openai/gpt-oss-120b-like"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(requests).toEqual([
      {
        organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5,
        approvedModelAlias: "openai/gpt-oss-120b-like"
      }
    ]);
  });

  it("maps sync placement authentication and domain validation failures", async () => {
    const authenticationApp = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      () => Promise.reject(new Error("unused sync path")),
      () => Promise.reject(new OrganizationApiKeyAuthenticationError())
    );
    const validationApp = buildPlacementApp(
      () => Promise.resolve({ candidates: [] }),
      () => Promise.reject(new DomainValidationError("Bad sync placement.")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Buyer key",
            secretPrefix: "csk_buyer___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        })
    );
    apps.push(authenticationApp, validationApp);

    const authenticationResponse = await authenticationApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placements/sync",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });
    const validationResponse = await validationApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/placements/sync",
      headers: {
        "x-api-key": "csk_buyer_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 7.5
      }
    });

    expect(authenticationResponse.statusCode).toBe(401);
    expect(authenticationResponse.json()).toMatchObject({
      error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR"
    });
    expect(validationResponse.statusCode).toBe(400);
    expect(validationResponse.json()).toMatchObject({
      error: "DOMAIN_VALIDATION_ERROR"
    });
  });
});
