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

describe("provider routing profile route", () => {
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

  it("stores routing metadata and exposes it in provider node detail", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-12T18:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-12T18:00:00.000Z"),
          () => "unused-provider-routing-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-12T18:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-12T18:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-12T18:05:00.000Z"),
        () => "csk_provider_routing_secret_000000"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-12T18:30:00.000Z")
        ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-12T18:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-12T18:10:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-12T19:00:00.000Z")
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(
        repository
      ),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(
        repository
      ),
      upsertProviderNodeRoutingProfileUseCase:
        new UpsertProviderNodeRoutingProfileUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-12T19:15:00.000Z")
        ),
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
        name: "Acme Provider Routing",
        slug: "acme-provider-routing",
        founder: {
          email: "provider-routing-owner@example.com",
          displayName: "Provider Routing Owner"
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
        label: "Provider routing agent",
        environment: "production"
      }
    });
    const apiKeyPayload = issueApiKeyResponseSchema.parse(
      JSON.parse(issueApiKeyResponse.body)
    );

    const nodeResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes`,
      headers: { "x-api-key": apiKeyPayload.secret },
      payload: {
        machineId: "node-machine-routing-0001",
        label: "Provider Routing Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-routing-01.internal",
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
    const nodePayload = enrollProviderNodeResponseSchema.parse(
      JSON.parse(nodeResponse.body)
    );

    const upsertResponse = await app.inject({
      method: "PUT",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes/${nodePayload.node.id}/routing-profile`,
      headers: { "x-api-key": apiKeyPayload.secret },
      payload: {
        endpointUrl: "https://node-routing.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    expect(upsertResponse.statusCode).toBe(200);
    expect(JSON.parse(upsertResponse.body)).toMatchObject({
      routingProfile: {
        providerNodeId: nodePayload.node.id,
        endpointUrl: "https://node-routing.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationPayload.organization.id}/environments/production/provider-nodes/${nodePayload.node.id}`,
      headers: { "x-api-key": apiKeyPayload.secret }
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(JSON.parse(detailResponse.body)).toMatchObject({
      node: {
        id: nodePayload.node.id,
        routingProfile: {
          endpointUrl: "https://node-routing.example.com/v1/chat/completions",
          priceFloorUsdPerHour: 5.25
        }
      }
    });

    await app.close();
  });
});
