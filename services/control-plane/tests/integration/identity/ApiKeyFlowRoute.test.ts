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

const issueApiKeyResponseSchema = z.object({
  apiKey: z.object({
    id: z.uuid(),
    organizationId: z.uuid(),
    label: z.string(),
    environment: z.enum(["development", "staging", "production"]),
    secretPrefix: z.string(),
    issuedByUserId: z.uuid(),
    createdAt: z.iso.datetime()
  }),
  secret: z.string()
});

describe("organization API key flow", () => {
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

  it("issues an organization/environment-scoped API key and authenticates an access check", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T15:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T15:00:00.000Z"),
          () => "unused-api-key-invite-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T15:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T15:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-09T15:30:00.000Z"),
        () => "csk_integration_secret_value_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T16:00:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T15:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T16:00:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T16:00:00.000Z")
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(
        repository
      ),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(
        repository
      ),
      issueProviderNodeAttestationChallengeUseCase: {
        execute: () =>
          Promise.reject(
            new Error("unused provider attestation challenge path")
          )
      },
      submitProviderNodeAttestationUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider attestation submit path"))
      },
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
        name: "Acme API",
        slug: "acme-api",
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

    const issueApiKeyResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/api-keys`,
      payload: {
        actorUserId: organizationPayload.founder.userId,
        label: "Production deploy key",
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
        label: "Production deploy key",
        environment: "production",
        issuedByUserId: organizationPayload.founder.userId,
        secretPrefix: "csk_integrat"
      },
      secret: "csk_integration_secret_value_000000"
    });

    const accessCheckResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationPayload.organization.id}/access-check?environment=production`,
      headers: {
        "x-api-key": apiKeyPayload.secret
      }
    });

    expect(accessCheckResponse.statusCode).toBe(200);
    expect(JSON.parse(accessCheckResponse.body)).toEqual({
      authorized: true,
      scope: {
        organizationId: organizationPayload.organization.id,
        environment: "production"
      },
      apiKey: {
        id: apiKeyPayload.apiKey.id,
        label: "Production deploy key",
        secretPrefix: "csk_integrat",
        issuedByUserId: organizationPayload.founder.userId,
        createdAt: "2026-03-09T15:30:00.000Z",
        lastUsedAt: "2026-03-09T16:00:00.000Z"
      }
    });

    const storedApiKeyRows = await pool.query<{
      environment: string;
      label: string;
      secret_hash: string;
      secret_prefix: string;
      last_used_at: Date | null;
    }>(
      `
        SELECT environment, label, secret_hash, secret_prefix, last_used_at
        FROM organization_api_keys
        WHERE organization_id = $1
      `,
      [organizationPayload.organization.id]
    );

    expect(storedApiKeyRows.rows).toHaveLength(1);
    expect(storedApiKeyRows.rows[0]).toMatchObject({
      environment: "production",
      label: "Production deploy key",
      secret_prefix: "csk_integrat",
      last_used_at: new Date("2026-03-09T16:00:00.000Z")
    });
    expect(storedApiKeyRows.rows[0]?.secret_hash).not.toContain(
      "csk_integration_secret_value_000000"
    );

    await app.close();
  });
});
