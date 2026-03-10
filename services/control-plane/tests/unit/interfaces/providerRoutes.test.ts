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
import type { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { type AdmitProviderRuntimeWorkloadBundleUseCase } from "../../../src/application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import {
  type EnrollProviderNodeUseCase,
  ProviderCapabilityRequiredError,
  ProviderNodeMachineConflictError,
  ProviderOrganizationNotFoundError
} from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import {
  type GetProviderNodeDetailUseCase,
  ProviderNodeDetailCapabilityRequiredError,
  ProviderNodeDetailNotFoundError,
  ProviderNodeDetailOrganizationNotFoundError
} from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import {
  ProviderNodeAttestationCapabilityRequiredError,
  ProviderNodeAttestationNodeNotFoundError,
  ProviderNodeAttestationOrganizationNotFoundError,
  ProviderNodeAttestationRuntimeUnsupportedError,
  type IssueProviderNodeAttestationChallengeUseCase
} from "../../../src/application/provider/IssueProviderNodeAttestationChallengeUseCase.js";
import {
  ProviderBenchmarkHistoryCapabilityRequiredError,
  ProviderBenchmarkHistoryNodeNotFoundError,
  ProviderBenchmarkHistoryOrganizationNotFoundError,
  type ListProviderBenchmarkHistoryUseCase
} from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import {
  ProviderBenchmarkCapabilityRequiredError,
  ProviderBenchmarkNodeNotFoundError,
  ProviderBenchmarkOrganizationNotFoundError,
  type RecordProviderBenchmarkUseCase
} from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import {
  ProviderRoutingProfileCapabilityRequiredError,
  ProviderRoutingProfileNodeNotFoundError,
  ProviderRoutingProfileOrganizationNotFoundError,
  type UpsertProviderNodeRoutingProfileUseCase
} from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import {
  ProviderRoutingStateApprovedModelAliasNotFoundError,
  ProviderRoutingStateCapabilityRequiredError,
  ProviderRoutingStateNodeNotFoundError,
  ProviderRoutingStateOrganizationNotFoundError,
  type ReplaceProviderNodeRoutingStateUseCase
} from "../../../src/application/provider/ReplaceProviderNodeRoutingStateUseCase.js";
import {
  ProviderInventoryCapabilityRequiredError,
  ProviderInventoryOrganizationNotFoundError,
  type ListProviderInventoryUseCase
} from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import {
  ProviderNodeAttestationChallengeAlreadyUsedError,
  ProviderNodeAttestationChallengeExpiredError,
  ProviderNodeAttestationChallengeNotFoundError,
  ProviderNodeAttestationVerificationFailedError,
  type SubmitProviderNodeAttestationUseCase
} from "../../../src/application/provider/SubmitProviderNodeAttestationUseCase.js";
import { WorkloadBundleAdmissionRejectedError } from "../../../src/application/workload/WorkloadBundleAdmissionRejectedError.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function buildProviderApp(
  enrollExecute: EnrollProviderNodeUseCase["execute"],
  authenticateExecute: AuthenticateOrganizationApiKeyUseCase["execute"] = () =>
    Promise.reject(new Error("unused auth path")),
  recordBenchmarkExecute: RecordProviderBenchmarkUseCase["execute"] = () =>
    Promise.reject(new Error("unused benchmark path")),
  listInventoryExecute: ListProviderInventoryUseCase["execute"] = () =>
    Promise.reject(new Error("unused inventory path")),
  listBenchmarkHistoryExecute: ListProviderBenchmarkHistoryUseCase["execute"] = () =>
    Promise.reject(new Error("unused benchmark history path")),
  getProviderNodeDetailExecute: GetProviderNodeDetailUseCase["execute"] = () =>
    Promise.reject(new Error("unused node detail path")),
  upsertRoutingProfileExecute: UpsertProviderNodeRoutingProfileUseCase["execute"] = () =>
    Promise.reject(new Error("unused routing profile path")),
  admitRuntimeExecute: AdmitProviderRuntimeWorkloadBundleUseCase["execute"] = () =>
    Promise.reject(new Error("unused runtime admission path")),
  issueAttestationChallengeExecute: IssueProviderNodeAttestationChallengeUseCase["execute"] = () =>
    Promise.reject(new Error("unused attestation challenge path")),
  submitAttestationExecute: SubmitProviderNodeAttestationUseCase["execute"] = () =>
    Promise.reject(new Error("unused attestation submit path")),
  replaceRoutingStateExecute: ReplaceProviderNodeRoutingStateUseCase["execute"] = () =>
    Promise.reject(new Error("unused routing state path"))
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
      execute: () => Promise.reject(new Error("unused placement path"))
    } as unknown as ListPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase: {
      execute: () => Promise.reject(new Error("unused placement resolve path"))
    } as unknown as ResolveSyncPlacementUseCase,
    enrollProviderNodeUseCase: {
      execute: enrollExecute
    } as unknown as EnrollProviderNodeUseCase,
    recordProviderBenchmarkUseCase: {
      execute: recordBenchmarkExecute
    } as unknown as RecordProviderBenchmarkUseCase,
    listProviderInventoryUseCase: {
      execute: listInventoryExecute
    } as unknown as ListProviderInventoryUseCase,
    listProviderBenchmarkHistoryUseCase: {
      execute: listBenchmarkHistoryExecute
    } as unknown as ListProviderBenchmarkHistoryUseCase,
    getProviderNodeDetailUseCase: {
      execute: getProviderNodeDetailExecute
    } as unknown as GetProviderNodeDetailUseCase,
    issueProviderNodeAttestationChallengeUseCase: {
      execute: issueAttestationChallengeExecute
    } as unknown as IssueProviderNodeAttestationChallengeUseCase,
    submitProviderNodeAttestationUseCase: {
      execute: submitAttestationExecute
    } as unknown as SubmitProviderNodeAttestationUseCase,
    replaceProviderNodeRoutingStateUseCase: {
      execute: replaceRoutingStateExecute
    } as unknown as ReplaceProviderNodeRoutingStateUseCase,
    upsertProviderNodeRoutingProfileUseCase: {
      execute: upsertRoutingProfileExecute
    } as unknown as UpsertProviderNodeRoutingProfileUseCase,
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: admitRuntimeExecute
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

describe("provider routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("lists provider inventory summaries", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () =>
        Promise.resolve({
          nodes: [
            {
              node: {
                id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
                organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
                machineId: "node-machine-0001",
                label: "Primary Vetted Node",
                runtime: "linux",
                region: "eu-central-1",
                hostname: "node-01.internal",
                trustTier: "t1_vetted",
                healthState: "healthy",
                inventory: {
                  driverVersion: "550.54.14",
                  gpus: [
                    {
                      model: "NVIDIA A100",
                      vramGb: 80,
                      count: 4,
                      interconnect: "nvlink"
                    }
                  ]
                },
                routingProfile: null,
                enrolledAt: "2026-03-09T18:10:00.000Z"
              },
              latestBenchmark: {
                id: "a59fa110-f770-40eb-b6ea-7023a9fef2e3",
                providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
                gpuClass: "NVIDIA A100",
                vramGb: 80,
                throughputTokensPerSecond: 742.5,
                driverVersion: "550.54.14",
                recordedAt: "2026-03-09T19:00:00.000Z"
              }
            }
          ]
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it("requires an API key header for provider inventory listing", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes"
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid provider inventory params", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/environments/qa/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("issues attestation challenges for linux provider nodes", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () =>
        Promise.resolve({
          challenge: {
            id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
            nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
            expiresAt: "2026-03-10T10:05:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestation-challenges",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(201);
  });

  it("maps attestation challenge runtime conflicts to 409", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationRuntimeUnsupportedError("kubernetes")
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestation-challenges",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_RUNTIME_UNSUPPORTED"
    });
  });

  it("requires an API key header for attestation challenge issuance", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestation-challenges"
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "ORGANIZATION_API_KEY_MISSING"
    });
  });

  it("maps attestation challenge organization misses to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestation-challenges",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_ORGANIZATION_NOT_FOUND"
    });
  });

  it("maps attestation challenge node misses to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationNodeNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestation-challenges",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_NOT_FOUND"
    });
  });

  it("maps attestation challenge capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new ProviderNodeAttestationCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestation-challenges",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_CAPABILITY_REQUIRED"
    });
  });

  it("verifies attestation submissions", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.resolve({
          attestation: {
            status: "verified",
            effectiveTrustTier: "t2_attested",
            lastAttestedAt: "2026-03-10T10:01:00.000Z",
            attestationExpiresAt: "2026-03-11T10:01:00.000Z",
            attestationType: "tpm_quote_v1"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(201);
  });

  it("maps attestation verification failures to 422", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationVerificationFailedError(
            "signature_invalid"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_ATTESTATION_VERIFICATION_FAILED"
    });
  });

  it("requires an API key header for attestation submissions", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "ORGANIZATION_API_KEY_MISSING"
    });
  });

  it("rejects invalid attestation submission payloads", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: "short",
        quoteBase64: "too-short",
        pcrValues: {},
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("maps attestation challenge misses to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationChallengeNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_ATTESTATION_CHALLENGE_NOT_FOUND"
    });
  });

  it("maps used attestation challenges to 409", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationChallengeAlreadyUsedError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_ATTESTATION_CHALLENGE_ALREADY_USED"
    });
  });

  it("maps attestation submission organization misses to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_ORGANIZATION_NOT_FOUND"
    });
  });

  it("maps attestation submission capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () => Promise.reject(new ProviderNodeAttestationCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_CAPABILITY_REQUIRED"
    });
  });

  it("maps attestation submission node misses to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationNodeNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_NOT_FOUND"
    });
  });

  it("maps attestation submission runtime conflicts to 409", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationRuntimeUnsupportedError("kubernetes")
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_RUNTIME_UNSUPPORTED"
    });
  });

  it("maps expired attestation challenges to 409", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused history path")),
      () => Promise.reject(new Error("unused detail path")),
      () => Promise.reject(new Error("unused routing path")),
      () => Promise.reject(new Error("unused runtime admission path")),
      () => Promise.reject(new Error("unused challenge path")),
      () =>
        Promise.reject(
          new ProviderNodeAttestationChallengeExpiredError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/attestations",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        challengeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem:
          "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEV1qvH9x7mJYg7AQz2dJ0Y2Qq4YQJ2v+V\n4+0YB9nHkBqgV0m2Fq7V3r8fC7r7i8D1P8Q8h2Dk0bTtQ6dW5n8QWw==\n-----END PUBLIC KEY-----",
        quoteBase64:
          "ZXlKeGRXOTBaU0k2SW5aaGJIVmxJaXdpY0dOeVJHbG5aWE4wU0dWNElnb2lNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNVEV4TVRFeE1URXhNU0o5",
        pcrValues: {
          "0": "1111111111111111111111111111111111111111111111111111111111111111"
        },
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_ATTESTATION_CHALLENGE_EXPIRED"
    });
  });

  it("maps provider inventory capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new ProviderInventoryCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps missing provider inventory organizations to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () =>
        Promise.reject(
          new ProviderInventoryOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("lists benchmark history for a provider node", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () =>
        Promise.resolve({
          benchmarks: [
            {
              id: "a59fa110-f770-40eb-b6ea-7023a9fef2e3",
              providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
              gpuClass: "NVIDIA A100",
              vramGb: 80,
              throughputTokensPerSecond: 742.5,
              driverVersion: "550.54.14",
              recordedAt: "2026-03-09T19:00:00.000Z"
            },
            {
              id: "dbd4f6fc-8b90-4f32-9e57-d91fda18f600",
              providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
              gpuClass: "NVIDIA A100",
              vramGb: 80,
              throughputTokensPerSecond: 701.2,
              driverVersion: "550.54.14",
              recordedAt: "2026-03-09T18:55:00.000Z"
            }
          ]
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns direct detail for a provider node", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () =>
        Promise.resolve({
          node: {
            id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            machineId: "node-machine-0001",
            label: "Primary Vetted Node",
            runtime: "linux",
            region: "eu-central-1",
            hostname: "node-01.internal",
            trustTier: "t1_vetted",
            healthState: "healthy",
            inventory: {
              driverVersion: "550.54.14",
              gpus: [
                {
                  model: "NVIDIA A100",
                  vramGb: 80,
                  count: 4,
                  interconnect: "nvlink"
                }
              ]
            },
            routingProfile: null,
            enrolledAt: "2026-03-09T18:10:00.000Z"
          },
          latestBenchmark: {
            id: "a59fa110-f770-40eb-b6ea-7023a9fef2e3",
            providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
            gpuClass: "NVIDIA A100",
            vramGb: 80,
            throughputTokensPerSecond: 742.5,
            driverVersion: "550.54.14",
            recordedAt: "2026-03-09T19:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it("requires an API key header for provider node detail", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid provider node detail params", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/environments/qa/provider-nodes/not-a-uuid",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps missing provider node detail records to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () =>
        Promise.reject(
          new ProviderNodeDetailNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps provider node detail capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new ProviderNodeDetailCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps missing provider node detail organizations to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () =>
        Promise.reject(
          new ProviderNodeDetailOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("stores provider node routing metadata", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () =>
        Promise.resolve({
          routingProfile: {
            providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
            endpointUrl: "https://node-01.example.com/v1/chat/completions",
            priceFloorUsdPerHour: 5.25,
            updatedAt: "2026-03-12T19:15:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it("requires an API key header for provider routing profile updates", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid provider routing profile params", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/not-a-uuid/environments/qa/provider-nodes/not-a-uuid/routing-profile",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid provider routing profile request bodies", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        endpointUrl: "http://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 0
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps missing provider routing profile nodes to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () =>
        Promise.reject(
          new ProviderRoutingProfileNodeNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps provider routing profile capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new ProviderRoutingProfileCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps invalid provider routing profile API keys to 401", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () => Promise.reject(new OrganizationApiKeyAuthenticationError()),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new Error("unused routing profile path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      headers: {
        "x-api-key": "invalid"
      },
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps provider routing profile scope mismatches to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError()),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new Error("unused routing profile path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps missing provider routing profile organizations to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () =>
        Promise.reject(
          new ProviderRoutingProfileOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-profile",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("requires an API key header for benchmark history listing", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks"
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps missing benchmark-history provider nodes to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () =>
        Promise.reject(
          new ProviderBenchmarkHistoryNodeNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("rejects invalid benchmark-history route params", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/environments/qa/provider-nodes/not-a-uuid/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps invalid benchmark-history API keys to 401", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () => Promise.reject(new OrganizationApiKeyAuthenticationError()),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "invalid"
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps benchmark-history scope mismatches to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError()),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps benchmark-history provider capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () =>
        Promise.reject(new ProviderBenchmarkHistoryCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps missing benchmark-history organizations to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T20:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark record path")),
      () => Promise.reject(new Error("unused inventory path")),
      () =>
        Promise.reject(
          new ProviderBenchmarkHistoryOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("enrolls a provider node", async () => {
    const app = buildProviderApp(
      () =>
        Promise.resolve({
          node: {
            id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            machineId: "node-machine-0001",
            label: "Primary Vetted Node",
            runtime: "linux",
            region: "eu-central-1",
            hostname: "node-01.internal",
            trustTier: "t1_vetted",
            healthState: "healthy",
            inventory: {
              driverVersion: "550.54.14",
              gpus: [
                {
                  model: "NVIDIA A100",
                  vramGb: 80,
                  count: 4,
                  interconnect: "nvlink"
                }
              ]
            },
            enrolledAt: "2026-03-09T17:00:00.000Z"
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
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T17:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [
            {
              model: "NVIDIA A100",
              vramGb: 80,
              count: 4,
              interconnect: "nvlink"
            }
          ]
        }
      }
    });

    expect(response.statusCode).toBe(201);
  });

  it("requires an API key header", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid route params", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/environments/qa/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects invalid request bodies", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "short",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: []
        }
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps provider capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new ProviderCapabilityRequiredError()),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T17:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "PROVIDER_CAPABILITY_REQUIRED",
      message:
        "Organization must have provider capability before enrolling provider nodes."
    });
  });

  it("maps duplicate machine IDs to 409", async () => {
    const app = buildProviderApp(
      () =>
        Promise.reject(
          new ProviderNodeMachineConflictError("node-machine-0001")
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
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T17:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(409);
  });

  it("maps invalid API keys to 401", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new OrganizationApiKeyAuthenticationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps scope mismatches to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps organization-not-found errors to 404", async () => {
    const app = buildProviderApp(
      () =>
        Promise.reject(
          new ProviderOrganizationNotFoundError(
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
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T17:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps domain validation failures to 400", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new DomainValidationError("Bad provider input.")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T17:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [{ model: "NVIDIA A100", vramGb: 80, count: 4 }]
        }
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("records a provider benchmark", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () =>
        Promise.resolve({
          benchmark: {
            id: "a59fa110-f770-40eb-b6ea-7023a9fef2e3",
            providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
            gpuClass: "NVIDIA A100",
            vramGb: 80,
            throughputTokensPerSecond: 742.5,
            driverVersion: "550.54.14",
            recordedAt: "2026-03-09T19:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(201);
  });

  it("rejects invalid benchmark request bodies", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 0,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("requires an API key header for provider benchmark recording", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid provider benchmark route params", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/environments/qa/provider-nodes/not-a-uuid/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps missing benchmark provider nodes to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () =>
        Promise.reject(
          new ProviderBenchmarkNodeNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps invalid benchmark API keys to 401", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () => Promise.reject(new OrganizationApiKeyAuthenticationError()),
      () => Promise.reject(new Error("unused benchmark path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("maps benchmark scope mismatches to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError()),
      () => Promise.reject(new Error("unused benchmark path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps benchmark provider capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () => Promise.reject(new ProviderBenchmarkCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps missing benchmark organizations to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () =>
        Promise.reject(
          new ProviderBenchmarkOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/benchmarks",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("admits a signed workload bundle for a provider node", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new Error("unused routing profile path")),
      () =>
        Promise.resolve({
          admission: {
            admitted: true,
            bundleId: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            manifestId: "chat-gpt-oss-120b-like-v1",
            signatureKeyId: "local-hmac-v1",
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
            admittedAt: "2026-03-09T20:10:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle: {
          bundle: {
            id: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            modelManifestId: "chat-gpt-oss-120b-like-v1",
            imageDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            runtimeConfig: {
              requestKind: "chat.completions",
              streamingEnabled: false,
              maxTokens: 1024,
              temperature: null,
              topP: null
            },
            networkPolicy: "provider-endpoint-only",
            maxRuntimeSeconds: 120,
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-09T20:00:00.000Z"
          },
          signature:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it("maps runtime admission rejections to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new Error("unused routing profile path")),
      () =>
        Promise.reject(
          new WorkloadBundleAdmissionRejectedError("signature_invalid")
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle: {
          bundle: {
            id: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            modelManifestId: "chat-gpt-oss-120b-like-v1",
            imageDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            runtimeConfig: {
              requestKind: "chat.completions",
              streamingEnabled: false,
              maxTokens: 1024,
              temperature: null,
              topP: null
            },
            networkPolicy: "provider-endpoint-only",
            maxRuntimeSeconds: 120,
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-09T20:00:00.000Z"
          },
          signature:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("requires an API key header for runtime admission", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      payload: {
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle: {
          bundle: {
            id: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            modelManifestId: "chat-gpt-oss-120b-like-v1",
            imageDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            runtimeConfig: {
              requestKind: "chat.completions",
              streamingEnabled: false,
              maxTokens: 1024,
              temperature: null,
              topP: null
            },
            networkPolicy: "provider-endpoint-only",
            maxRuntimeSeconds: 120,
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-09T20:00:00.000Z"
          },
          signature:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid runtime admission payloads", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        expectedCustomerOrganizationId: "not-a-uuid",
        signedBundle: {
          bundle: {
            id: "not-a-uuid"
          }
        }
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("maps runtime admission scope mismatches to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle: {
          bundle: {
            id: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            modelManifestId: "chat-gpt-oss-120b-like-v1",
            imageDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            runtimeConfig: {
              requestKind: "chat.completions",
              streamingEnabled: false,
              maxTokens: 1024,
              temperature: null,
              topP: null
            },
            networkPolicy: "provider-endpoint-only",
            maxRuntimeSeconds: 120,
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-09T20:00:00.000Z"
          },
          signature:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps missing provider nodes during runtime admission to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new Error("unused routing profile path")),
      () =>
        Promise.reject(
          new ProviderNodeDetailNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle: {
          bundle: {
            id: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            modelManifestId: "chat-gpt-oss-120b-like-v1",
            imageDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            runtimeConfig: {
              requestKind: "chat.completions",
              streamingEnabled: false,
              maxTokens: 1024,
              temperature: null,
              topP: null
            },
            networkPolicy: "provider-endpoint-only",
            maxRuntimeSeconds: 120,
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-09T20:00:00.000Z"
          },
          signature:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it("maps runtime admission organization and capability failures", async () => {
    const organizationMissingApp = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new Error("unused routing profile path")),
      () =>
        Promise.reject(
          new ProviderNodeDetailOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    const capabilityApp = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused benchmark path")),
      () => Promise.reject(new Error("unused inventory path")),
      () => Promise.reject(new Error("unused benchmark history path")),
      () => Promise.reject(new Error("unused node detail path")),
      () => Promise.reject(new Error("unused routing profile path")),
      () => Promise.reject(new ProviderNodeDetailCapabilityRequiredError())
    );
    apps.push(organizationMissingApp, capabilityApp);

    const organizationResponse = await organizationMissingApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle: {
          bundle: {
            id: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            modelManifestId: "chat-gpt-oss-120b-like-v1",
            imageDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            runtimeConfig: {
              requestKind: "chat.completions",
              streamingEnabled: false,
              maxTokens: 1024,
              temperature: null,
              topP: null
            },
            networkPolicy: "provider-endpoint-only",
            maxRuntimeSeconds: 120,
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-09T20:00:00.000Z"
          },
          signature:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });
    const capabilityResponse = await capabilityApp.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/runtime-admissions",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle: {
          bundle: {
            id: "a1f6d551-4896-4e11-95b8-d8eed13192af",
            modelManifestId: "chat-gpt-oss-120b-like-v1",
            imageDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
            runtimeConfig: {
              requestKind: "chat.completions",
              streamingEnabled: false,
              maxTokens: 1024,
              temperature: null,
              topP: null
            },
            networkPolicy: "provider-endpoint-only",
            maxRuntimeSeconds: 120,
            customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-09T20:00:00.000Z"
          },
          signature:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          signatureKeyId: "local-hmac-v1"
        }
      }
    });

    expect(organizationResponse.statusCode).toBe(404);
    expect(organizationResponse.json()).toMatchObject({
      error: "PROVIDER_ORGANIZATION_NOT_FOUND"
    });
    expect(capabilityResponse.statusCode).toBe(403);
    expect(capabilityResponse.json()).toMatchObject({
      error: "PROVIDER_CAPABILITY_REQUIRED"
    });
  });

  it("replaces provider routing state", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () =>
        Promise.resolve({
          routingState: {
            warmModelAliases: [
              {
                approvedModelAlias: "openai/gpt-oss-120b-like",
                declaredAt: "2026-03-09T20:00:00.000Z",
                expiresAt: "2026-03-09T20:10:00.000Z"
              }
            ]
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like",
            expiresAt: "2026-03-09T20:10:00.000Z"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      routingState: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like"
          }
        ]
      }
    });
  });

  it("maps missing approved aliases during routing-state replacement to 404", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () =>
        Promise.reject(
          new ProviderRoutingStateApprovedModelAliasNotFoundError(
            "openai/not-approved"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/not-approved",
            expiresAt: "2026-03-09T20:10:00.000Z"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: "APPROVED_MODEL_ALIAS_NOT_FOUND"
    });
  });

  it("requires an API key header for provider routing-state replacement", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      payload: {
        warmModelAliases: []
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid routing-state payloads", async () => {
    const app = buildProviderApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        warmModelAliases: [
          {
            approvedModelAlias: "ok",
            expiresAt: "not-a-datetime"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR"
    });
  });

  it("maps routing-state domain validation failures to 400", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () =>
        Promise.reject(
          new DomainValidationError(
            "Warm model state expiry cannot exceed 15 minutes from declaration."
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like",
            expiresAt: "2026-03-09T20:20:00.000Z"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "DOMAIN_VALIDATION_ERROR"
    });
  });

  it("maps routing-state buyer capability failures to 403", async () => {
    const app = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () => Promise.reject(new ProviderRoutingStateCapabilityRequiredError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like",
            expiresAt: "2026-03-09T20:10:00.000Z"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "PROVIDER_CAPABILITY_REQUIRED"
    });
  });

  it("maps routing-state organization and node lookup failures", async () => {
    const organizationMissingApp = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () =>
        Promise.reject(
          new ProviderRoutingStateOrganizationNotFoundError(
            "0d6b1676-f112-41d6-9f98-27277a0dba79"
          )
        )
    );
    const nodeMissingApp = buildProviderApp(
      () => Promise.reject(new Error("unused enroll path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "Agent key",
            secretPrefix: "csk_agent___",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T19:00:00.000Z"
          }
        }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () =>
        Promise.reject(
          new ProviderRoutingStateNodeNotFoundError(
            "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
          )
        )
    );
    apps.push(organizationMissingApp, nodeMissingApp);

    const organizationResponse = await organizationMissingApp.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like",
            expiresAt: "2026-03-09T20:10:00.000Z"
          }
        ]
      }
    });
    const nodeResponse = await nodeMissingApp.inject({
      method: "PUT",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/provider-nodes/ab3f9623-eb23-4dc8-8f15-2d84f5b48e43/routing-state",
      headers: {
        "x-api-key": "csk_agent_secret_value_000000"
      },
      payload: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like",
            expiresAt: "2026-03-09T20:10:00.000Z"
          }
        ]
      }
    });

    expect(organizationResponse.statusCode).toBe(404);
    expect(organizationResponse.json()).toMatchObject({
      error: "PROVIDER_ORGANIZATION_NOT_FOUND"
    });
    expect(nodeResponse.statusCode).toBe(404);
    expect(nodeResponse.json()).toMatchObject({
      error: "PROVIDER_NODE_NOT_FOUND"
    });
  });
});
