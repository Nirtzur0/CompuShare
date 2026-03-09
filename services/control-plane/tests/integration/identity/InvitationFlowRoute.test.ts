import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { z } from "zod";
import { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { StructuredConsoleAuditLog } from "../../../src/infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

interface PgMemModule {
  Pool: new () => Pool;
}

const createOrganizationResponseSchema = z.object({
  organization: z.object({
    id: z.uuid()
  }),
  founder: z.object({
    userId: z.uuid()
  })
});

const issueInvitationResponseSchema = z.object({
  invitation: z.object({
    organizationId: z.uuid(),
    inviteeEmail: z.email(),
    role: z.string(),
    invitedByUserId: z.uuid()
  }),
  token: z.string()
});

const issueApiKeyResponseSchema = z.object({
  apiKey: z.object({
    organizationId: z.uuid(),
    environment: z.enum(["development", "staging", "production"]),
    issuedByUserId: z.uuid()
  }),
  secret: z.string()
});

const acceptInvitationResponseSchema = z.object({
  organizationId: z.uuid(),
  membership: z.object({
    email: z.email(),
    displayName: z.string(),
    role: z.string(),
    joinedAt: z.iso.datetime()
  })
});

describe("organization invitation flow", () => {
  let pool: Pool;

  beforeAll(async () => {
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const pgAdapter = database.adapters.createPg() as unknown as PgMemModule;
    pool = new pgAdapter.Pool();

    const schemaInitializer = new IdentitySchemaInitializer(pool);
    await schemaInitializer.ensureSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("issues an invitation and accepts it into organization membership", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T09:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T10:00:00.000Z"),
          () => "integration-invite-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T10:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T10:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-09T10:00:00.000Z"),
        () => "csk_unused_invitation_secret_0001"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T10:00:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T09:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T10:00:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T10:00:00.000Z")
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(
        repository
      ),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(
        repository
      ),
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog),
      listProviderBenchmarkHistoryUseCase:
        new ListProviderBenchmarkHistoryUseCase(repository),
      admitProviderRuntimeWorkloadBundleUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider runtime admission path"))
      },
      recordCustomerChargeUseCase: {
        execute: () => Promise.reject(new Error("unused finance charge path"))
      },

      recordCompletedJobSettlementUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance settlement path"))
      },

      getStagedPayoutExportUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance payout export path"))
      },

      getOrganizationWalletSummaryUseCase: {
        execute: () => Promise.reject(new Error("unused finance wallet path"))
      },
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },

      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway chat path"))
      }
    });

    const createOrganizationResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: {
        name: "Acme AI",
        slug: "acme-ai",
        founder: {
          email: "owner@example.com",
          displayName: "Founding Owner"
        },
        accountCapabilities: ["buyer", "provider"]
      }
    });

    expect(createOrganizationResponse.statusCode).toBe(201);
    const organizationPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createOrganizationResponse.body)
    );

    const issueInvitationResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/invitations`,
      payload: {
        inviterUserId: organizationPayload.founder.userId,
        inviteeEmail: "admin@example.com",
        role: "admin"
      }
    });

    expect(issueInvitationResponse.statusCode).toBe(201);
    const issueInvitationPayload = issueInvitationResponseSchema.parse(
      JSON.parse(issueInvitationResponse.body)
    );
    expect(issueInvitationPayload).toMatchObject({
      invitation: {
        organizationId: organizationPayload.organization.id,
        inviteeEmail: "admin@example.com",
        role: "admin",
        invitedByUserId: organizationPayload.founder.userId
      },
      token: "integration-invite-token-0001"
    });

    const acceptInvitationResponse = await app.inject({
      method: "POST",
      url: "/v1/invitations/integration-invite-token-0001/accept",
      payload: {
        inviteeDisplayName: "Accepted Admin"
      }
    });

    expect(acceptInvitationResponse.statusCode).toBe(200);
    const acceptInvitationPayload = acceptInvitationResponseSchema.parse(
      JSON.parse(acceptInvitationResponse.body)
    );
    expect(acceptInvitationPayload).toMatchObject({
      organizationId: organizationPayload.organization.id,
      membership: {
        email: "admin@example.com",
        displayName: "Accepted Admin",
        role: "admin",
        joinedAt: "2026-03-10T10:00:00.000Z"
      }
    });

    const membershipRows = await pool.query<{
      role: string;
      email: string;
    }>(
      `
        SELECT organization_members.role, users.email
        FROM organization_members
        JOIN users ON users.id = organization_members.user_id
        WHERE organization_members.organization_id = $1
        ORDER BY users.email ASC
      `,
      [organizationPayload.organization.id]
    );

    expect(membershipRows.rows).toEqual([
      { role: "admin", email: "admin@example.com" },
      { role: "owner", email: "owner@example.com" }
    ]);

    const invitationRows = await pool.query<{
      accepted_at: Date | null;
      accepted_by_user_id: string | null;
    }>(
      `
        SELECT accepted_at, accepted_by_user_id
        FROM organization_invitations
        WHERE organization_id = $1
      `,
      [organizationPayload.organization.id]
    );

    expect(invitationRows.rows).toHaveLength(1);
    expect(invitationRows.rows[0]?.accepted_at?.toISOString()).toBe(
      "2026-03-10T10:00:00.000Z"
    );
    expect(invitationRows.rows[0]?.accepted_by_user_id).not.toBeNull();

    await app.close();
  });

  it("issues an invitation through the scoped machine-auth route and accepts it into organization membership", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-11T09:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-11T11:00:00.000Z"),
          () => "integration-machine-invite-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-12T10:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-12T10:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-11T10:00:00.000Z"),
        () => "csk_machine_invitation_secret_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-11T11:00:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-11T09:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-11T11:00:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-11T11:00:00.000Z")
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(
        repository
      ),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(
        repository
      ),
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(repository, auditLog),
      listProviderBenchmarkHistoryUseCase:
        new ListProviderBenchmarkHistoryUseCase(repository),
      admitProviderRuntimeWorkloadBundleUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider runtime admission path"))
      },
      recordCustomerChargeUseCase: {
        execute: () => Promise.reject(new Error("unused finance charge path"))
      },

      recordCompletedJobSettlementUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance settlement path"))
      },

      getStagedPayoutExportUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance payout export path"))
      },

      getOrganizationWalletSummaryUseCase: {
        execute: () => Promise.reject(new Error("unused finance wallet path"))
      },
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },

      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway chat path"))
      }
    });

    const createOrganizationResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: {
        name: "Acme Machine Invitations",
        slug: "acme-machine-invitations",
        founder: {
          email: "owner-machine@example.com",
          displayName: "Machine Owner"
        },
        accountCapabilities: ["buyer", "provider"]
      }
    });

    expect(createOrganizationResponse.statusCode).toBe(201);
    const organizationPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createOrganizationResponse.body)
    );

    const issueApiKeyResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/api-keys`,
      payload: {
        actorUserId: organizationPayload.founder.userId,
        label: "Invitation automation",
        environment: "production"
      }
    });

    expect(issueApiKeyResponse.statusCode).toBe(201);
    const apiKeyPayload = issueApiKeyResponseSchema.parse(
      JSON.parse(issueApiKeyResponse.body)
    );
    expect(apiKeyPayload).toMatchObject({
      apiKey: {
        organizationId: organizationPayload.organization.id,
        environment: "production",
        issuedByUserId: organizationPayload.founder.userId
      },
      secret: "csk_machine_invitation_secret_000000"
    });

    const issueInvitationResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/invitations`,
      headers: {
        "x-api-key": apiKeyPayload.secret
      },
      payload: {
        inviterUserId: organizationPayload.founder.userId,
        inviteeEmail: "machine-admin@example.com",
        role: "admin"
      }
    });

    expect(issueInvitationResponse.statusCode).toBe(201);
    const issueInvitationPayload = issueInvitationResponseSchema.parse(
      JSON.parse(issueInvitationResponse.body)
    );
    expect(issueInvitationPayload).toMatchObject({
      invitation: {
        organizationId: organizationPayload.organization.id,
        inviteeEmail: "machine-admin@example.com",
        role: "admin",
        invitedByUserId: organizationPayload.founder.userId
      },
      token: "integration-machine-invite-token-0001"
    });

    const acceptInvitationResponse = await app.inject({
      method: "POST",
      url: "/v1/invitations/integration-machine-invite-token-0001/accept",
      payload: {
        inviteeDisplayName: "Machine Accepted Admin"
      }
    });

    expect(acceptInvitationResponse.statusCode).toBe(200);
    const acceptInvitationPayload = acceptInvitationResponseSchema.parse(
      JSON.parse(acceptInvitationResponse.body)
    );
    expect(acceptInvitationPayload).toMatchObject({
      organizationId: organizationPayload.organization.id,
      membership: {
        email: "machine-admin@example.com",
        displayName: "Machine Accepted Admin",
        role: "admin",
        joinedAt: "2026-03-12T10:00:00.000Z"
      }
    });

    await app.close();
  });
});
