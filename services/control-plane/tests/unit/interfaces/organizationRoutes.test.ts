import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError,
  type AuthenticateOrganizationApiKeyUseCase
} from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import {
  OrganizationApiKeyAuthorizationError,
  type IssueOrganizationApiKeyUseCase
} from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import {
  OrganizationSlugConflictError,
  type CreateOrganizationUseCase
} from "../../../src/application/identity/CreateOrganizationUseCase.js";
import {
  OrganizationMemberNotFoundError,
  OrganizationMemberRoleAuthorizationError,
  OrganizationOwnerInvariantError
} from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
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

const validPayload = {
  name: "Acme AI",
  slug: "acme-ai",
  founder: {
    email: "founder@example.com",
    displayName: "Founding Owner"
  },
  accountCapabilities: ["buyer", "provider"]
};

function buildAppWithExecute(
  execute: CreateOrganizationUseCase["execute"],
  updateRoleExecute: UpdateOrganizationMemberRoleUseCase["execute"] = () =>
    Promise.reject(new Error("unused member role path")),
  issueApiKeyExecute: IssueOrganizationApiKeyUseCase["execute"] = () =>
    Promise.reject(new Error("unused api key path")),
  authenticateApiKeyExecute: AuthenticateOrganizationApiKeyUseCase["execute"] = () =>
    Promise.reject(new Error("unused auth check path"))
): FastifyInstance {
  return buildApp({
    createOrganizationUseCase: { execute } as CreateOrganizationUseCase,
    issueOrganizationInvitationUseCase: {
      execute: () => Promise.reject(new Error("unused invitation path"))
    } as unknown as IssueOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase: {
      execute: () =>
        Promise.reject(new Error("unused invitation acceptance path"))
    } as unknown as AcceptOrganizationInvitationUseCase,
    updateOrganizationMemberRoleUseCase: {
      execute: updateRoleExecute
    } as unknown as UpdateOrganizationMemberRoleUseCase,
    issueOrganizationApiKeyUseCase: {
      execute: issueApiKeyExecute
    } as unknown as IssueOrganizationApiKeyUseCase,
    authenticateOrganizationApiKeyUseCase: {
      execute: authenticateApiKeyExecute
    } as unknown as AuthenticateOrganizationApiKeyUseCase,
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
      execute: () =>
        Promise.reject(new Error("unused provider node detail path"))
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

describe("organization routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("returns 400 when the request body is invalid", async () => {
    const app = buildAppWithExecute(() => {
      return Promise.reject(new Error("should not run"));
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: {
        ...validPayload,
        slug: "Bad Slug"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid string: must match pattern /^[a-z0-9-]+$/u"
    });
  });

  it("maps domain validation errors to 400", async () => {
    const app = buildAppWithExecute(() => {
      return Promise.reject(new DomainValidationError("Bad domain input."));
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: validPayload
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad domain input."
    });
  });

  it("maps slug conflicts to 409", async () => {
    const app = buildAppWithExecute(() => {
      return Promise.reject(new OrganizationSlugConflictError("acme-ai"));
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: validPayload
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_SLUG_CONFLICT",
      message: 'Organization slug "acme-ai" is already in use.'
    });
  });

  it("rethrows unexpected errors as 500 responses", async () => {
    const app = buildAppWithExecute(() => Promise.reject(new Error("boom")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: validPayload
    });

    expect(response.statusCode).toBe(500);
  });

  it("updates a member role through the organization routes", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () =>
        Promise.resolve({
          membership: {
            userId: "4cc9c629-c530-40df-b070-9694c47ef542",
            role: "finance",
            joinedAt: "2026-03-09T00:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      membership: {
        userId: "4cc9c629-c530-40df-b070-9694c47ef542",
        role: "finance",
        joinedAt: "2026-03-09T00:00:00.000Z"
      }
    });
  });

  it("maps member role authorization failures to 403", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new OrganizationMemberRoleAuthorizationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "MEMBER_ROLE_AUTHORIZATION_ERROR",
      message: "Actor is not allowed to change this organization member role."
    });
  });

  it("maps missing members to 404", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () =>
        Promise.reject(
          new OrganizationMemberNotFoundError(
            "4cc9c629-c530-40df-b070-9694c47ef542"
          )
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_MEMBER_NOT_FOUND",
      message:
        'Organization member "4cc9c629-c530-40df-b070-9694c47ef542" was not found.'
    });
  });

  it("maps last-owner invariant failures to 409", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new OrganizationOwnerInvariantError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "admin"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_OWNER_INVARIANT",
      message: "An organization must retain at least one owner."
    });
  });

  it("updates a member role through the scoped machine-auth organization route", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () =>
        Promise.resolve({
          membership: {
            userId: "4cc9c629-c530-40df-b070-9694c47ef542",
            role: "finance",
            joinedAt: "2026-03-09T00:00:00.000Z"
          }
        }),
      () => Promise.reject(new Error("unused api key path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "CI deploy key",
            secretPrefix: "csk_example_",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T01:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      membership: {
        userId: "4cc9c629-c530-40df-b070-9694c47ef542",
        role: "finance",
        joinedAt: "2026-03-09T00:00:00.000Z"
      }
    });
  });

  it("requires an API key for the scoped machine-auth member-role route", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_MISSING",
      message: "An x-api-key header is required."
    });
  });

  it("returns 400 when scoped machine-auth member-role params are invalid", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/not-a-uuid/environments/qa/members/not-a-uuid/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("returns 400 when scoped machine-auth member-role body is invalid", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "not-a-uuid",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("maps invalid organization API keys on the scoped member-role route to 401", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("unused api key path")),
      () => Promise.reject(new OrganizationApiKeyAuthenticationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
      message: "The provided organization API key is invalid."
    });
  });

  it("maps scope mismatches on the scoped member-role route to 403", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("unused api key path")),
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
      message:
        "The provided organization API key does not match the requested scope."
    });
  });

  it("maps member-role authorization failures on the scoped machine-auth route to 403", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new OrganizationMemberRoleAuthorizationError()),
      () => Promise.reject(new Error("unused api key path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "CI deploy key",
            secretPrefix: "csk_example_",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T01:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "MEMBER_ROLE_AUTHORIZATION_ERROR",
      message: "Actor is not allowed to change this organization member role."
    });
  });

  it("maps missing members on the scoped machine-auth route to 404", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () =>
        Promise.reject(
          new OrganizationMemberNotFoundError(
            "4cc9c629-c530-40df-b070-9694c47ef542"
          )
        ),
      () => Promise.reject(new Error("unused api key path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "CI deploy key",
            secretPrefix: "csk_example_",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T01:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_MEMBER_NOT_FOUND",
      message:
        'Organization member "4cc9c629-c530-40df-b070-9694c47ef542" was not found.'
    });
  });

  it("maps owner invariant failures on the scoped machine-auth route to 409", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new OrganizationOwnerInvariantError()),
      () => Promise.reject(new Error("unused api key path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "CI deploy key",
            secretPrefix: "csk_example_",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T01:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "admin"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_OWNER_INVARIANT",
      message: "An organization must retain at least one owner."
    });
  });

  it("rethrows unexpected scoped machine-auth member-role failures as 500 responses", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("boom")),
      () => Promise.reject(new Error("unused api key path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "CI deploy key",
            secretPrefix: "csk_example_",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T01:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/environments/production/members/4cc9c629-c530-40df-b070-9694c47ef542/role",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      },
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        role: "finance"
      }
    });

    expect(response.statusCode).toBe(500);
  });

  it("issues an organization API key", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () =>
        Promise.resolve({
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
            label: "CI deploy key",
            environment: "staging",
            secretPrefix: "csk_example_",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z"
          },
          secret: "csk_example_secret_value_000000"
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/api-keys",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        label: "CI deploy key",
        environment: "staging"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      apiKey: {
        id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
        organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
        label: "CI deploy key",
        environment: "staging",
        secretPrefix: "csk_example_",
        issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        createdAt: "2026-03-09T00:00:00.000Z"
      },
      secret: "csk_example_secret_value_000000"
    });
  });

  it("maps organization API key authorization failures to 403", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new OrganizationApiKeyAuthorizationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/api-keys",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        label: "CI deploy key",
        environment: "staging"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_AUTHORIZATION_ERROR",
      message: "Only owner or admin members may issue organization API keys."
    });
  });

  it("rethrows unexpected organization API key issuance failures as 500 responses", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("boom"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/api-keys",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        label: "CI deploy key",
        environment: "staging"
      }
    });

    expect(response.statusCode).toBe(500);
  });

  it("returns 400 when organization API key issuance params are invalid", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/api-keys",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        label: "CI deploy key",
        environment: "staging"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("returns 400 when organization API key issuance body is invalid", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/api-keys",
      payload: {
        actorUserId: "not-a-uuid",
        label: "x",
        environment: "qa"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("maps organization API key domain validation failures to 400", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () =>
        Promise.reject(
          new DomainValidationError("Bad organization API key input.")
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/api-keys",
      payload: {
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        label: "CI deploy key",
        environment: "staging"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad organization API key input."
    });
  });

  it("returns 401 when the organization API key header is missing", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/access-check?environment=production"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_MISSING",
      message: "An x-api-key header is required."
    });
  });

  it("maps invalid organization API keys to 401", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("unused api key path")),
      () => Promise.reject(new OrganizationApiKeyAuthenticationError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/access-check?environment=production",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
      message: "The provided organization API key is invalid."
    });
  });

  it("returns 400 when the organization API key access-check params are invalid", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/not-a-uuid/access-check?environment=production",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("returns 400 when the organization API key access-check query is invalid", async () => {
    const app = buildAppWithExecute(() =>
      Promise.reject(new Error("unused create org path"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/access-check?environment=qa",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message:
        'Invalid option: expected one of "development"|"staging"|"production"'
    });
  });

  it("maps organization API key access-check domain validation failures to 400", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("unused api key path")),
      () =>
        Promise.reject(
          new DomainValidationError("Bad organization API key lookup.")
        )
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/access-check?environment=production",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad organization API key lookup."
    });
  });

  it("authenticates an organization API key access check", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("unused api key path")),
      () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
            environment: "production"
          },
          apiKey: {
            id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
            label: "CI deploy key",
            secretPrefix: "csk_example_",
            issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
            createdAt: "2026-03-09T00:00:00.000Z",
            lastUsedAt: "2026-03-09T01:00:00.000Z"
          }
        })
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/access-check?environment=production",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      authorized: true,
      scope: {
        organizationId: "d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0",
        environment: "production"
      },
      apiKey: {
        id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
        label: "CI deploy key",
        secretPrefix: "csk_example_",
        issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        createdAt: "2026-03-09T00:00:00.000Z",
        lastUsedAt: "2026-03-09T01:00:00.000Z"
      }
    });
  });

  it("rethrows unexpected organization API key access-check failures as 500 responses", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("unused api key path")),
      () => Promise.reject(new Error("boom"))
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/access-check?environment=production",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(500);
  });

  it("maps scope mismatches to 403", async () => {
    const app = buildAppWithExecute(
      () => Promise.reject(new Error("unused create org path")),
      () => Promise.reject(new Error("unused member role path")),
      () => Promise.reject(new Error("unused api key path")),
      () => Promise.reject(new OrganizationApiKeyScopeMismatchError())
    );
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/organizations/d6bf5b6d-8b9c-41dc-8dd9-e41f8d0fb7c0/access-check?environment=production",
      headers: {
        "x-api-key": "csk_example_secret_value_000000"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
      message:
        "The provided organization API key does not match the requested scope."
    });
  });
});
