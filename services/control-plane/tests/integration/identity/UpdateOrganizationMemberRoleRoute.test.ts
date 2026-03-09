import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import { z } from "zod";
import type { Pool } from "pg";
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

const acceptInvitationResponseSchema = z.object({
  membership: z.object({
    userId: z.uuid()
  })
});

describe("PATCH /v1/organizations/:organizationId/members/:memberUserId/role", () => {
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

  it("updates a member role when requested by an owner", async () => {
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
          () => "role-update-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T11:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T12:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-09T12:00:00.000Z"),
        () => "csk_unused_role_secret_0001"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T12:00:00.000Z")
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
        () => new Date("2026-03-09T12:00:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T12:00:00.000Z")
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
        slug: "acme-ai-role-update",
        founder: {
          email: "owner@example.com",
          displayName: "Founding Owner"
        },
        accountCapabilities: ["buyer", "provider"]
      }
    });

    const organizationPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createOrganizationResponse.body)
    );

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/invitations`,
      payload: {
        inviterUserId: organizationPayload.founder.userId,
        inviteeEmail: "member@example.com",
        role: "developer"
      }
    });

    const acceptInvitationResponse = await app.inject({
      method: "POST",
      url: "/v1/invitations/role-update-token-0001/accept",
      payload: {
        inviteeDisplayName: "Accepted Member"
      }
    });

    const acceptedPayload = acceptInvitationResponseSchema.parse(
      JSON.parse(acceptInvitationResponse.body)
    );

    const updateRoleResponse = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${organizationPayload.organization.id}/members/${acceptedPayload.membership.userId}/role`,
      payload: {
        actorUserId: organizationPayload.founder.userId,
        role: "finance"
      }
    });

    expect(updateRoleResponse.statusCode).toBe(200);
    expect(JSON.parse(updateRoleResponse.body)).toEqual({
      membership: {
        userId: acceptedPayload.membership.userId,
        role: "finance",
        joinedAt: "2026-03-09T11:00:00.000Z"
      }
    });

    const membershipRows = await pool.query<{ role: string }>(
      `
        SELECT role
        FROM organization_members
        WHERE organization_id = $1 AND user_id = $2
      `,
      [organizationPayload.organization.id, acceptedPayload.membership.userId]
    );

    expect(membershipRows.rows).toEqual([{ role: "finance" }]);

    await app.close();
  });

  it("updates a member role through the scoped machine-auth route", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T09:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T10:00:00.000Z"),
          () => "machine-role-update-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T11:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T13:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-10T12:00:00.000Z"),
        () => "csk_machine_role_secret_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T13:00:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T09:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T13:00:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-10T13:00:00.000Z")
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
        name: "Acme AI Machine Role Update",
        slug: "acme-ai-machine-role-update",
        founder: {
          email: "owner-machine@example.com",
          displayName: "Machine Owner"
        },
        accountCapabilities: ["buyer", "provider"]
      }
    });

    const organizationPayload = createOrganizationResponseSchema.parse(
      JSON.parse(createOrganizationResponse.body)
    );

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/invitations`,
      payload: {
        inviterUserId: organizationPayload.founder.userId,
        inviteeEmail: "member-machine@example.com",
        role: "developer"
      }
    });

    const acceptInvitationResponse = await app.inject({
      method: "POST",
      url: "/v1/invitations/machine-role-update-token-0001/accept",
      payload: {
        inviteeDisplayName: "Accepted Machine Member"
      }
    });

    const acceptedPayload = acceptInvitationResponseSchema.parse(
      JSON.parse(acceptInvitationResponse.body)
    );

    const issueApiKeyResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/api-keys`,
      payload: {
        actorUserId: organizationPayload.founder.userId,
        label: "Role automation",
        environment: "production"
      }
    });

    const apiKeyPayload = z
      .object({
        secret: z.string()
      })
      .parse(JSON.parse(issueApiKeyResponse.body));

    const updateRoleResponse = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/members/${acceptedPayload.membership.userId}/role`,
      headers: {
        "x-api-key": apiKeyPayload.secret
      },
      payload: {
        actorUserId: organizationPayload.founder.userId,
        role: "finance"
      }
    });

    expect(updateRoleResponse.statusCode).toBe(200);
    expect(JSON.parse(updateRoleResponse.body)).toEqual({
      membership: {
        userId: acceptedPayload.membership.userId,
        role: "finance",
        joinedAt: "2026-03-10T11:00:00.000Z"
      }
    });

    const membershipRows = await pool.query<{ role: string }>(
      `
        SELECT role
        FROM organization_members
        WHERE organization_id = $1 AND user_id = $2
      `,
      [organizationPayload.organization.id, acceptedPayload.membership.userId]
    );

    expect(membershipRows.rows).toEqual([{ role: "finance" }]);

    await app.close();
  });
});
