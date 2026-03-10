import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { GetConsumerDashboardOverviewUseCase } from "../../../src/application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../../src/application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { GetOrganizationWalletSummaryUseCase } from "../../../src/application/ledger/GetOrganizationWalletSummaryUseCase.js";
import { GetStagedPayoutExportUseCase } from "../../../src/application/ledger/GetStagedPayoutExportUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../../src/application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../../src/application/ledger/RecordCustomerChargeUseCase.js";
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

describe("provider dashboard overview route", () => {
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

  it("returns a provider overview summary backed by persisted inventory and ledger data", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T20:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T20:00:00.000Z"),
          () => "unused-dashboard-token-0001"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T20:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T20:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-09T20:05:00.000Z"),
        () => "csk_provider_dashboard_secret_0001"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T20:30:00.000Z")
        ),
      recordCustomerChargeUseCase: new RecordCustomerChargeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T20:10:00.000Z")
      ),
      recordCompletedJobSettlementUseCase:
        new RecordCompletedJobSettlementUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T20:20:00.000Z")
        ),
      getStagedPayoutExportUseCase: new GetStagedPayoutExportUseCase(
        repository
      ),
      getOrganizationWalletSummaryUseCase:
        new GetOrganizationWalletSummaryUseCase(repository),
      getConsumerDashboardOverviewUseCase:
        new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      getProviderDashboardOverviewUseCase:
        new GetProviderDashboardOverviewUseCase(repository, auditLog),
      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway path"))
      },
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T20:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T20:15:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T20:16:00.000Z")
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
      }
    });

    const ownerUserId = "345db7ff-1355-43c7-b333-6ae1e7246c3f";
    const providerOrganizationId = "c341ab74-a535-4139-ab2d-d2714f7df507";
    const buyerOrganizationId = "8a4bad52-0b06-47a0-a663-2eb1e59451d0";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        ownerUserId,
        "provider-dashboard-owner@example.com",
        "Provider Dashboard Owner",
        new Date("2026-03-09T20:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5),
               ($6, $7, $8, $9, $10)
      `,
      [
        providerOrganizationId,
        "Dashboard Provider Org",
        "dashboard-provider-org",
        ["provider"],
        new Date("2026-03-09T20:00:00.000Z"),
        buyerOrganizationId,
        "Dashboard Buyer Org",
        "dashboard-buyer-org",
        ["buyer"],
        new Date("2026-03-09T20:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organization_members (organization_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, $4),
               ($5, $2, $6, $7)
      `,
      [
        providerOrganizationId,
        ownerUserId,
        "finance",
        new Date("2026-03-09T20:01:00.000Z"),
        buyerOrganizationId,
        "finance",
        new Date("2026-03-09T20:01:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id, organization_id, machine_id, label, runtime, region, hostname, trust_tier, health_state, driver_version, enrolled_at
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
          ($12, $2, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `,
      [
        "1c64fd84-7f03-4d0b-a141-5f4d3510d9f2",
        providerOrganizationId,
        "node-machine-dashboard-0001",
        "Dashboard Primary Node",
        "linux",
        "eu-central-1",
        "dashboard-node-01.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-09T20:15:00.000Z"),
        "dafdf62b-90a1-48d0-b719-44ef6026edd0",
        "node-machine-dashboard-0002",
        "Dashboard Warm Spare",
        "linux",
        "us-east-1",
        "dashboard-node-02.internal",
        "t2_attested",
        "paused",
        "550.54.14",
        new Date("2026-03-09T20:16:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO provider_node_gpus (provider_node_id, ordinal, model, vram_gb, gpu_count, interconnect)
        VALUES
          ($1, 0, $2, $3, $4, $5),
          ($6, 0, $7, $8, $9, $10)
      `,
      [
        "1c64fd84-7f03-4d0b-a141-5f4d3510d9f2",
        "NVIDIA A100",
        80,
        4,
        "nvlink",
        "dafdf62b-90a1-48d0-b719-44ef6026edd0",
        "NVIDIA H100",
        80,
        8,
        "nvlink"
      ]
    );

    const chargeResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/customer-charges`,
      payload: {
        actorUserId: ownerUserId,
        amountUsd: "100.00",
        paymentReference: "stripe_pi_dashboard_0001"
      }
    });
    expect(chargeResponse.statusCode).toBe(201);

    const settlementResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/job-settlements`,
      payload: {
        actorUserId: ownerUserId,
        providerOrganizationId,
        providerPayableUsd: "42.00",
        platformRevenueUsd: "6.00",
        reserveHoldbackUsd: "2.00",
        jobReference: "job_dashboard_0001"
      }
    });
    expect(settlementResponse.statusCode).toBe(201);

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${providerOrganizationId}/dashboard/provider-overview?actorUserId=${ownerUserId}`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      overview: {
        organizationId: providerOrganizationId,
        actorRole: "finance",
        activeNodeCount: 2,
        healthSummary: {
          healthy: 1,
          degraded: 0,
          paused: 1
        },
        trustTierSummary: {
          community: 0,
          vetted: 1,
          attested: 1
        },
        balances: {
          organizationId: providerOrganizationId,
          usageBalanceUsd: "0.00",
          spendCreditsUsd: "0.00",
          pendingEarningsUsd: "42.00",
          withdrawableCashUsd: "40.00"
        },
        nodes: [
          {
            id: "1c64fd84-7f03-4d0b-a141-5f4d3510d9f2",
            label: "Dashboard Primary Node",
            region: "eu-central-1",
            hostname: "dashboard-node-01.internal",
            healthState: "healthy",
            trustTier: "t1_vetted",
            gpuCount: 4,
            primaryGpuModel: "NVIDIA A100"
          },
          {
            id: "dafdf62b-90a1-48d0-b719-44ef6026edd0",
            label: "Dashboard Warm Spare",
            region: "us-east-1",
            hostname: "dashboard-node-02.internal",
            healthState: "paused",
            trustTier: "t2_attested",
            gpuCount: 8,
            primaryGpuModel: "NVIDIA H100"
          }
        ]
      }
    });
    const payload: {
      overview: {
        earningsTrend: { earningsUsd: string; reserveHoldbackUsd: string }[];
        estimatedUtilizationTrend: unknown[];
      };
    } = response.json();

    expect(
      payload.overview.earningsTrend.some(
        (point) =>
          point.earningsUsd === "42.00" && point.reserveHoldbackUsd === "2.00"
      )
    ).toBe(true);
    expect(payload.overview.estimatedUtilizationTrend).toHaveLength(7);

    await app.close();
  });
});
