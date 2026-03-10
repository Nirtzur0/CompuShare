import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { GetConsumerDashboardOverviewUseCase } from "../../../src/application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../../src/application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { GetProviderPricingSimulatorUseCase } from "../../../src/application/dashboard/GetProviderPricingSimulatorUseCase.js";
import { GetOrganizationWalletSummaryUseCase } from "../../../src/application/ledger/GetOrganizationWalletSummaryUseCase.js";
import { GetStagedPayoutExportUseCase } from "../../../src/application/ledger/GetStagedPayoutExportUseCase.js";
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
import { LedgerPosting } from "../../../src/domain/ledger/LedgerPosting.js";
import { LedgerTransaction } from "../../../src/domain/ledger/LedgerTransaction.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

interface PgMemModule {
  Pool: new () => Pool;
}

describe("provider pricing simulator route", () => {
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

  it("returns provider pricing baselines and explicit unavailable reasons", async () => {
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
          () => "unused-pricing-token-0001"
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
        () => "csk_provider_pricing_secret_0001"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T20:30:00.000Z")
        ),
      recordCustomerChargeUseCase: {
        execute: () => Promise.reject(new Error("unused finance charge path"))
      },
      recordCompletedJobSettlementUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance settlement path"))
      },
      getStagedPayoutExportUseCase: new GetStagedPayoutExportUseCase(
        repository
      ),
      getOrganizationWalletSummaryUseCase:
        new GetOrganizationWalletSummaryUseCase(repository),
      getConsumerDashboardOverviewUseCase:
        new GetConsumerDashboardOverviewUseCase(repository, auditLog),
      getProviderDashboardOverviewUseCase:
        new GetProviderDashboardOverviewUseCase(repository, auditLog),
      getProviderPricingSimulatorUseCase:
        new GetProviderPricingSimulatorUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-10T09:00:00.000Z")
        ),
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

    const financeUserId = "3a9d3367-3188-497d-b1e0-5fdf85ac9c5d";
    const providerOrganizationId = "c341ab74-a535-4139-ab2d-d2714f7df507";
    const buyerOrganizationId = "8a4bad52-0b06-47a0-a663-2eb1e59451d0";
    const firstNodeId = "1c64fd84-7f03-4d0b-a141-5f4d3510d9f2";
    const secondNodeId = "dafdf62b-90a1-48d0-b719-44ef6026edd0";
    const decisionLogId = "06053d7c-9c76-40d3-bc5e-1dc46311be54";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        financeUserId,
        "provider-pricing-owner@example.com",
        "Provider Pricing Owner",
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
        "Pricing Provider Org",
        "pricing-provider-org",
        ["provider"],
        new Date("2026-03-09T20:00:00.000Z"),
        buyerOrganizationId,
        "Pricing Buyer Org",
        "pricing-buyer-org",
        ["buyer"],
        new Date("2026-03-09T20:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organization_members (organization_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        providerOrganizationId,
        financeUserId,
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
        firstNodeId,
        providerOrganizationId,
        "node-machine-pricing-0001",
        "Pricing Primary Node",
        "linux",
        "eu-central-1",
        "pricing-node-01.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-09T20:15:00.000Z"),
        secondNodeId,
        "node-machine-pricing-0002",
        "Pricing Backup Node",
        "linux",
        "us-east-1",
        "pricing-node-02.internal",
        "t2_attested",
        "degraded",
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
        firstNodeId,
        "NVIDIA A100",
        80,
        4,
        "nvlink",
        secondNodeId,
        "NVIDIA H100",
        80,
        8,
        "nvlink"
      ]
    );
    await pool.query(
      `
        INSERT INTO provider_node_benchmarks (
          id,
          provider_node_id,
          gpu_class,
          vram_gb,
          throughput_tokens_per_second,
          driver_version,
          recorded_at
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7),
          ($8, $9, $10, $11, $12, $13, $14)
      `,
      [
        "b7b2df74-ef6a-497a-8285-73d83d819abc",
        firstNodeId,
        "NVIDIA A100",
        80,
        690,
        "550.54.14",
        new Date("2026-03-09T20:17:00.000Z"),
        "b7dbfe08-220b-4f58-a247-1ee210f0f463",
        secondNodeId,
        "NVIDIA H100",
        80,
        900,
        "550.54.14",
        new Date("2026-03-09T20:18:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO provider_node_routing_profiles (
          provider_node_id,
          endpoint_url,
          price_floor_usd_per_hour,
          updated_at
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        firstNodeId,
        "https://provider-1.example.com/v1/chat/completions",
        8.5,
        new Date("2026-03-09T20:19:00.000Z")
      ]
    );
    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId: buyerOrganizationId,
        transactionType: "job_settlement",
        reference: "pricing-job-0001",
        createdByUserId: financeUserId,
        occurredAt: new Date("2026-03-09T20:20:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amount: UsdAmount.parse("50.00"),
            organizationId: buyerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "provider_payable",
            direction: "credit",
            amount: UsdAmount.parse("42.00"),
            organizationId: providerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "platform_revenue",
            direction: "credit",
            amount: UsdAmount.parse("6.00")
          }),
          LedgerPosting.create({
            accountCode: "risk_reserve",
            direction: "credit",
            amount: UsdAmount.parse("2.00"),
            organizationId: providerOrganizationId
          })
        ]
      })
    );
    await pool.query(
      `
        INSERT INTO placement_decision_logs (
          id,
          organization_id,
          environment,
          gpu_class,
          min_vram_gb,
          region,
          minimum_trust_tier,
          max_price_usd_per_hour,
          approved_model_alias,
          candidate_count,
          selected_provider_node_id,
          selected_provider_organization_id,
          selection_score,
          price_performance_score,
          warm_cache_matched,
          rejection_reason,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
      `,
      [
        decisionLogId,
        buyerOrganizationId,
        "development",
        "NVIDIA A100",
        80,
        "eu-central-1",
        "t1_vetted",
        10,
        "openai/gpt-oss-120b-like",
        2,
        firstNodeId,
        providerOrganizationId,
        93.35,
        81.18,
        false,
        null,
        new Date("2026-03-09T20:25:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO gateway_usage_meter_events (
          workload_bundle_id,
          occurred_at,
          customer_organization_id,
          provider_organization_id,
          provider_node_id,
          environment,
          request_kind,
          approved_model_alias,
          manifest_id,
          decision_log_id,
          batch_id,
          batch_item_id,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          latency_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, $11, $12, $13, $14)
      `,
      [
        "1b77f2f7-83d7-435c-bbd4-b31ba546b847",
        new Date("2026-03-09T20:30:00.000Z"),
        buyerOrganizationId,
        providerOrganizationId,
        firstNodeId,
        "development",
        "chat.completions",
        "openai/gpt-oss-120b-like",
        "chat-gpt-oss-120b-like-v1",
        decisionLogId,
        16_560_000,
        16_560_000,
        33_120_000,
        180
      ]
    );

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${providerOrganizationId}/dashboard/provider-pricing-simulator?actorUserId=${financeUserId}`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      simulator: {
        organizationId: providerOrganizationId,
        actorRole: "finance",
        simulatableNodeCount: 1,
        unavailableNodeCount: 1,
        assumptions: {
          netProjectionStatus: "available",
          settlementCount: 1,
          realizedPlatformFeePercent: 12,
          realizedReserveHoldbackPercent: 4,
          realizedWithdrawablePercent: 80
        },
        nodes: [
          {
            id: firstNodeId,
            label: "Pricing Primary Node",
            simulationStatus: "simulatable",
            currentPriceFloorUsdPerHour: 8.5,
            observedUtilizationPercent: 7.94
          },
          {
            id: secondNodeId,
            label: "Pricing Backup Node",
            simulationStatus: "unavailable",
            unavailableReason: "missing_routing_profile"
          }
        ]
      }
    });
  });
});
