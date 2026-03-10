import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  OrganizationInvitationExpiredError,
  OrganizationMembershipConflictError,
  OrganizationInvitationNotFoundError
} from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError,
  type AuthenticateOrganizationApiKeyUseCase
} from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import type { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import type { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import type { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import {
  PendingOrganizationInvitationConflictError,
  OrganizationInvitationAuthorizationError
} from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import type { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import type { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import type { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import type { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function createStubCreateOrganizationUseCase(): CreateOrganizationUseCase {
  return {
    execute: () => Promise.reject(new Error("unused create organization path"))
  } as unknown as CreateOrganizationUseCase;
}

function createStubIssueOrganizationInvitationUseCase(
  execute: IssueOrganizationInvitationUseCase["execute"]
): IssueOrganizationInvitationUseCase {
  return { execute } as unknown as IssueOrganizationInvitationUseCase;
}

function createStubAcceptOrganizationInvitationUseCase(
  execute: AcceptOrganizationInvitationUseCase["execute"]
): AcceptOrganizationInvitationUseCase {
  return { execute } as unknown as AcceptOrganizationInvitationUseCase;
}

function createStubUpdateOrganizationMemberRoleUseCase(): UpdateOrganizationMemberRoleUseCase {
  return {
    execute: () => Promise.reject(new Error("unused member role path"))
  } as unknown as UpdateOrganizationMemberRoleUseCase;
}

function createStubIssueOrganizationApiKeyUseCase(): IssueOrganizationApiKeyUseCase {
  return {
    execute: () => Promise.reject(new Error("unused api key path"))
  } as unknown as IssueOrganizationApiKeyUseCase;
}

function createStubAuthenticateOrganizationApiKeyUseCase(
  execute: AuthenticateOrganizationApiKeyUseCase["execute"] = () =>
    Promise.reject(new Error("unused api key auth path"))
): AuthenticateOrganizationApiKeyUseCase {
  return {
    execute
  } as unknown as AuthenticateOrganizationApiKeyUseCase;
}

function createStubEnrollProviderNodeUseCase(): EnrollProviderNodeUseCase {
  return {
    execute: () => Promise.reject(new Error("unused provider path"))
  } as unknown as EnrollProviderNodeUseCase;
}

function createStubRecordProviderBenchmarkUseCase(): RecordProviderBenchmarkUseCase {
  return {
    execute: () => Promise.reject(new Error("unused provider benchmark path"))
  } as unknown as RecordProviderBenchmarkUseCase;
}

function createStubListProviderInventoryUseCase(): ListProviderInventoryUseCase {
  return {
    execute: () => Promise.reject(new Error("unused provider inventory path"))
  } as unknown as ListProviderInventoryUseCase;
}

function createStubGetProviderNodeDetailUseCase(): GetProviderNodeDetailUseCase {
  return {
    execute: () => Promise.reject(new Error("unused provider node detail path"))
  } as unknown as GetProviderNodeDetailUseCase;
}

function createStubListProviderBenchmarkHistoryUseCase(): ListProviderBenchmarkHistoryUseCase {
  return {
    execute: () =>
      Promise.reject(new Error("unused provider benchmark history path"))
  } as unknown as ListProviderBenchmarkHistoryUseCase;
}

function createStubUpsertProviderNodeRoutingProfileUseCase(): UpsertProviderNodeRoutingProfileUseCase {
  return {
    execute: () =>
      Promise.reject(new Error("unused provider routing profile path"))
  } as unknown as UpsertProviderNodeRoutingProfileUseCase;
}

function buildInvitationApp(dependencies: {
  issueExecute: IssueOrganizationInvitationUseCase["execute"];
  acceptExecute: AcceptOrganizationInvitationUseCase["execute"];
  authenticateExecute?: AuthenticateOrganizationApiKeyUseCase["execute"];
}): FastifyInstance {
  return buildApp({
    createOrganizationUseCase: createStubCreateOrganizationUseCase(),
    issueOrganizationInvitationUseCase:
      createStubIssueOrganizationInvitationUseCase(dependencies.issueExecute),
    acceptOrganizationInvitationUseCase:
      createStubAcceptOrganizationInvitationUseCase(dependencies.acceptExecute),
    updateOrganizationMemberRoleUseCase:
      createStubUpdateOrganizationMemberRoleUseCase(),
    issueOrganizationApiKeyUseCase: createStubIssueOrganizationApiKeyUseCase(),
    authenticateOrganizationApiKeyUseCase:
      createStubAuthenticateOrganizationApiKeyUseCase(
        dependencies.authenticateExecute
      ),
    listPlacementCandidatesUseCase: {
      execute: () => Promise.reject(new Error("unused placement path"))
    } as unknown as ListPlacementCandidatesUseCase,
    resolveSyncPlacementUseCase: {
      execute: () => Promise.reject(new Error("unused placement resolve path"))
    } as unknown as ResolveSyncPlacementUseCase,
    enrollProviderNodeUseCase: createStubEnrollProviderNodeUseCase(),
    recordProviderBenchmarkUseCase: createStubRecordProviderBenchmarkUseCase(),
    listProviderInventoryUseCase: createStubListProviderInventoryUseCase(),
    getProviderNodeDetailUseCase: createStubGetProviderNodeDetailUseCase(),
    issueProviderNodeAttestationChallengeUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider attestation challenge path"))
    },
    submitProviderNodeAttestationUseCase: {
      execute: () =>
        Promise.reject(new Error("unused provider attestation submit path"))
    },
    upsertProviderNodeRoutingProfileUseCase:
      createStubUpsertProviderNodeRoutingProfileUseCase(),
    listProviderBenchmarkHistoryUseCase:
      createStubListProviderBenchmarkHistoryUseCase(),
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

describe("invitation routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("returns 400 when invitation issuance input is invalid", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/invitations",
      payload: {
        inviterUserId: "not-a-uuid",
        inviteeEmail: "bad-email",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("maps invite authorization failures to 403", async () => {
    const app = buildInvitationApp({
      issueExecute: () =>
        Promise.reject(new OrganizationInvitationAuthorizationError()),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/invitations",
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "INVITATION_AUTHORIZATION_ERROR",
      message: "Only owner or admin members may invite organization members."
    });
  });

  it("returns 400 when invitation issuance body is invalid", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/invitations",
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "bad-email",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid email address"
    });
  });

  it("maps duplicate pending invitations to 409", async () => {
    const app = buildInvitationApp({
      issueExecute: () =>
        Promise.reject(
          new PendingOrganizationInvitationConflictError("invitee@example.com")
        ),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/invitations",
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "PENDING_INVITATION_CONFLICT",
      message: 'A pending invitation already exists for "invitee@example.com".'
    });
  });

  it("maps invitation domain validation failures to 400", async () => {
    const app = buildInvitationApp({
      issueExecute: () =>
        Promise.reject(new DomainValidationError("Bad invitation input.")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/invitations",
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad invitation input."
    });
  });

  it("returns 400 when scoped machine-auth invitation params are invalid", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/not-a-uuid/environments/qa/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("returns 400 when scoped machine-auth invitation body is invalid", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "not-a-uuid",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid UUID"
    });
  });

  it("issues an invitation through the scoped machine-auth route", async () => {
    const app = buildInvitationApp({
      issueExecute: () =>
        Promise.resolve({
          invitation: {
            id: "9d4aa5eb-01e8-4267-a887-987f0d5a81d0",
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            inviteeEmail: "invitee@example.com",
            role: "developer",
            invitedByUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
            expiresAt: "2026-03-16T10:00:00.000Z"
          },
          token: "machine-route-invitation-token-0001"
        }),
      acceptExecute: () => Promise.reject(new Error("unused")),
      authenticateExecute: () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "3e517f0f-7f89-4f2b-a317-101c5d359480",
            label: "Automation key",
            secretPrefix: "csk_machine_",
            issuedByUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
            createdAt: "2026-03-09T10:00:00.000Z",
            lastUsedAt: "2026-03-09T10:00:00.000Z"
          }
        })
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      invitation: {
        id: "9d4aa5eb-01e8-4267-a887-987f0d5a81d0",
        organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        inviteeEmail: "invitee@example.com",
        role: "developer",
        invitedByUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        expiresAt: "2026-03-16T10:00:00.000Z"
      },
      token: "machine-route-invitation-token-0001"
    });
  });

  it("requires an API key for the scoped machine-auth invitation route", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_MISSING",
      message: "An x-api-key header is required."
    });
  });

  it("maps invalid organization API keys on the scoped machine-auth invitation route to 401", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused")),
      authenticateExecute: () =>
        Promise.reject(new OrganizationApiKeyAuthenticationError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
      message: "The provided organization API key is invalid."
    });
  });

  it("maps API key scope mismatches on the scoped machine-auth invitation route to 403", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused")),
      authenticateExecute: () =>
        Promise.reject(new OrganizationApiKeyScopeMismatchError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
      message:
        "The provided organization API key does not match the requested scope."
    });
  });

  it("maps invitation RBAC failures on the scoped machine-auth invitation route to 403", async () => {
    const app = buildInvitationApp({
      issueExecute: () =>
        Promise.reject(new OrganizationInvitationAuthorizationError()),
      acceptExecute: () => Promise.reject(new Error("unused")),
      authenticateExecute: () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "3e517f0f-7f89-4f2b-a317-101c5d359480",
            label: "Automation key",
            secretPrefix: "csk_machine_",
            issuedByUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
            createdAt: "2026-03-09T10:00:00.000Z",
            lastUsedAt: "2026-03-09T10:00:00.000Z"
          }
        })
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "INVITATION_AUTHORIZATION_ERROR",
      message: "Only owner or admin members may invite organization members."
    });
  });

  it("maps duplicate invitations on the scoped machine-auth invitation route to 409", async () => {
    const app = buildInvitationApp({
      issueExecute: () =>
        Promise.reject(
          new PendingOrganizationInvitationConflictError("invitee@example.com")
        ),
      acceptExecute: () => Promise.reject(new Error("unused")),
      authenticateExecute: () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "3e517f0f-7f89-4f2b-a317-101c5d359480",
            label: "Automation key",
            secretPrefix: "csk_machine_",
            issuedByUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
            createdAt: "2026-03-09T10:00:00.000Z",
            lastUsedAt: "2026-03-09T10:00:00.000Z"
          }
        })
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "PENDING_INVITATION_CONFLICT",
      message: 'A pending invitation already exists for "invitee@example.com".'
    });
  });

  it("maps domain validation failures from scoped machine-auth invitation issuance to 400", async () => {
    const app = buildInvitationApp({
      issueExecute: () =>
        Promise.reject(
          new DomainValidationError("Bad machine invitation input.")
        ),
      acceptExecute: () => Promise.reject(new Error("unused")),
      authenticateExecute: () =>
        Promise.resolve({
          authorized: true,
          scope: {
            organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
            environment: "production"
          },
          apiKey: {
            id: "3e517f0f-7f89-4f2b-a317-101c5d359480",
            label: "Automation key",
            secretPrefix: "csk_machine_",
            issuedByUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
            createdAt: "2026-03-09T10:00:00.000Z",
            lastUsedAt: "2026-03-09T10:00:00.000Z"
          }
        })
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/environments/production/invitations",
      headers: {
        "x-api-key": "csk_machine_secret_value_000000"
      },
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad machine invitation input."
    });
  });

  it("maps missing invitation tokens to 404", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () =>
        Promise.reject(new OrganizationInvitationNotFoundError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/invitations/invitation-token-route-0001/accept",
      payload: {
        inviteeDisplayName: "Accepted User"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "INVITATION_NOT_FOUND",
      message: "Invitation token is invalid or no pending invitation exists."
    });
  });

  it("returns 400 when invitation acceptance body is invalid", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/invitations/invitation-token-route-0001/accept",
      payload: {
        inviteeDisplayName: ""
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Too small: expected string to have >=2 characters"
    });
  });

  it("returns 400 when invitation acceptance token params are invalid", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/invitations/short/accept",
      payload: {
        inviteeDisplayName: "Accepted User"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "VALIDATION_ERROR",
      message: "Too small: expected string to have >=16 characters"
    });
  });

  it("maps expired invitations to 410", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () =>
        Promise.reject(new OrganizationInvitationExpiredError())
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/invitations/invitation-token-route-0002/accept",
      payload: {
        inviteeDisplayName: "Accepted User"
      }
    });

    expect(response.statusCode).toBe(410);
    expect(response.json()).toEqual({
      error: "INVITATION_EXPIRED",
      message: "Invitation has expired."
    });
  });

  it("maps invitation acceptance domain validation failures to 400", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () =>
        Promise.reject(new DomainValidationError("Bad acceptance input."))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/invitations/invitation-token-route-0004/accept",
      payload: {
        inviteeDisplayName: "Accepted User"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "DOMAIN_VALIDATION_ERROR",
      message: "Bad acceptance input."
    });
  });

  it("maps membership conflicts to 409", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () =>
        Promise.reject(
          new OrganizationMembershipConflictError("invitee@example.com")
        )
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/invitations/invitation-token-route-0003/accept",
      payload: {
        inviteeDisplayName: "Accepted User"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "ORGANIZATION_MEMBERSHIP_CONFLICT",
      message:
        'User "invitee@example.com" is already a member of this organization.'
    });
  });

  it("rethrows unexpected invitation issuance errors as 500 responses", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("boom")),
      acceptExecute: () => Promise.reject(new Error("unused"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations/0d6b1676-f112-41d6-9f98-27277a0dba79/invitations",
      payload: {
        inviterUserId: "6e551574-2ff0-4841-b9df-8fc31fd24d71",
        inviteeEmail: "invitee@example.com",
        role: "developer"
      }
    });

    expect(response.statusCode).toBe(500);
  });

  it("rethrows unexpected invitation acceptance errors as 500 responses", async () => {
    const app = buildInvitationApp({
      issueExecute: () => Promise.reject(new Error("unused")),
      acceptExecute: () => Promise.reject(new Error("boom"))
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/invitations/invitation-token-route-0005/accept",
      payload: {
        inviteeDisplayName: "Accepted User"
      }
    });

    expect(response.statusCode).toBe(500);
  });
});
