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
  secret: z.string()
});

describe("provider enrollment route", () => {
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

  it("enrolls a provider node and persists hardware inventory", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T18:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T18:00:00.000Z"),
          () => "unused-provider-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T18:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T18:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-09T18:05:00.000Z"),
        () => "csk_provider_agent_secret_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T18:10:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T18:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T18:10:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T18:10:00.000Z")
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
        name: "Acme Provider",
        slug: "acme-provider",
        founder: {
          email: "provider-owner@example.com",
          displayName: "Provider Owner"
        },
        accountCapabilities: ["provider"]
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
        label: "Provider agent",
        environment: "production"
      }
    });
    const apiKeyPayload = issueApiKeyResponseSchema.parse(
      JSON.parse(issueApiKeyResponse.body)
    );

    const enrollResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes`,
      headers: {
        "x-api-key": apiKeyPayload.secret
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

    expect(enrollResponse.statusCode).toBe(201);
    expect(JSON.parse(enrollResponse.body)).toMatchObject({
      node: {
        organizationId: organizationPayload.organization.id,
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
        }
      }
    });

    const providerNodes = await pool.query<{
      machine_id: string;
      runtime: string;
      region: string;
      hostname: string;
      trust_tier: string;
      health_state: string;
      driver_version: string;
    }>(
      `
        SELECT machine_id, runtime, region, hostname, trust_tier, health_state, driver_version
        FROM provider_nodes
        WHERE organization_id = $1
      `,
      [organizationPayload.organization.id]
    );

    expect(providerNodes.rows).toEqual([
      {
        machine_id: "node-machine-0001",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        trust_tier: "t1_vetted",
        health_state: "healthy",
        driver_version: "550.54.14"
      }
    ]);

    const providerGpus = await pool.query<{
      model: string;
      vram_gb: number;
      gpu_count: number;
      interconnect: string | null;
    }>(
      `
        SELECT model, vram_gb, gpu_count, interconnect
        FROM provider_node_gpus
      `
    );

    expect(providerGpus.rows).toEqual([
      {
        model: "NVIDIA A100",
        vram_gb: 80,
        gpu_count: 4,
        interconnect: "nvlink"
      }
    ]);

    await app.close();
  });
});
