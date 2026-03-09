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

const enrollProviderNodeResponseSchema = z.object({
  node: z.object({
    id: z.uuid()
  })
});

describe("provider inventory route", () => {
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

  it("lists provider inventory summaries with latest benchmark data", async () => {
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
          () => "unused-provider-list-token-0001"
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
        () => "csk_provider_list_secret_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T18:30:00.000Z")
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
        () => new Date("2026-03-09T19:00:00.000Z")
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
        name: "Acme Provider Inventory",
        slug: "acme-provider-inventory",
        founder: {
          email: "provider-inventory-owner@example.com",
          displayName: "Provider Inventory Owner"
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
        label: "Provider list agent",
        environment: "production"
      }
    });
    const apiKeyPayload = issueApiKeyResponseSchema.parse(
      JSON.parse(issueApiKeyResponse.body)
    );

    const firstNodeResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes`,
      headers: { "x-api-key": apiKeyPayload.secret },
      payload: {
        machineId: "node-machine-list-0001",
        label: "Primary List Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-list-01.internal",
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
    const firstNodePayload = enrollProviderNodeResponseSchema.parse(
      JSON.parse(firstNodeResponse.body)
    );

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes/${firstNodePayload.node.id}/benchmarks`,
      headers: { "x-api-key": apiKeyPayload.secret },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 701.2,
        driverVersion: "550.54.14"
      }
    });

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes/${firstNodePayload.node.id}/benchmarks`,
      headers: { "x-api-key": apiKeyPayload.secret },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes`,
      headers: { "x-api-key": apiKeyPayload.secret },
      payload: {
        machineId: "node-machine-list-0002",
        label: "Secondary List Node",
        runtime: "kubernetes",
        region: "us-east-1",
        hostname: "node-list-02.internal",
        inventory: {
          driverVersion: "550.60.02",
          gpus: [
            {
              model: "NVIDIA L40S",
              vramGb: 48,
              count: 2,
              interconnect: null
            }
          ]
        }
      }
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes`,
      headers: { "x-api-key": apiKeyPayload.secret }
    });

    expect(listResponse.statusCode).toBe(200);
    expect(JSON.parse(listResponse.body)).toMatchObject({
      nodes: [
        {
          node: {
            machineId: "node-machine-list-0001",
            label: "Primary List Node",
            runtime: "linux",
            trustTier: "t1_vetted",
            healthState: "healthy"
          },
          latestBenchmark: {
            gpuClass: "NVIDIA A100",
            throughputTokensPerSecond: 742.5
          }
        },
        {
          node: {
            machineId: "node-machine-list-0002",
            label: "Secondary List Node",
            runtime: "kubernetes",
            trustTier: "t1_vetted",
            healthState: "healthy"
          },
          latestBenchmark: null
        }
      ]
    });

    await app.close();
  });
});
