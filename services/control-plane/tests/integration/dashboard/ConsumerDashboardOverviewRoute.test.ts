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

describe("consumer dashboard overview route", () => {
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

  it("returns a consumer overview summary backed by persisted ledger data", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T21:00:00.000Z")
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T21:00:00.000Z"),
          () => "unused-dashboard-token-0002"
        ),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T21:00:00.000Z")
        ),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T21:00:00.000Z")
        ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        () => new Date("2026-03-09T21:05:00.000Z"),
        () => "csk_consumer_dashboard_secret_0001"
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T21:30:00.000Z")
        ),
      recordCustomerChargeUseCase: new RecordCustomerChargeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T21:10:00.000Z")
      ),
      recordCompletedJobSettlementUseCase:
        new RecordCompletedJobSettlementUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T21:20:00.000Z")
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
        () => new Date("2026-03-09T21:00:00.000Z")
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T21:15:00.000Z")
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T21:16:00.000Z")
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

    const financeUserId = "345db7ff-1355-43c7-b333-6ae1e7246c3f";
    const buyerOrganizationId = "8a4bad52-0b06-47a0-a663-2eb1e59451d0";
    const providerOrganizationId = "c341ab74-a535-4139-ab2d-d2714f7df507";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        financeUserId,
        "consumer-dashboard-finance@example.com",
        "Consumer Dashboard Finance",
        new Date("2026-03-09T21:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5),
               ($6, $7, $8, $9, $10)
      `,
      [
        buyerOrganizationId,
        "Dashboard Buyer Org",
        "dashboard-consumer-org",
        ["buyer"],
        new Date("2026-03-09T21:00:00.000Z"),
        providerOrganizationId,
        "Dashboard Provider Org",
        "dashboard-provider-payout-org",
        ["provider"],
        new Date("2026-03-09T21:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organization_members (organization_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        buyerOrganizationId,
        financeUserId,
        "finance",
        new Date("2026-03-09T21:01:00.000Z")
      ]
    );

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/customer-charges`,
      payload: {
        actorUserId: financeUserId,
        amountUsd: "100.00",
        paymentReference: "stripe_pi_dashboard_consumer_0001"
      }
    });

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/job-settlements`,
      payload: {
        actorUserId: financeUserId,
        providerOrganizationId,
        providerPayableUsd: "42.00",
        platformRevenueUsd: "6.00",
        reserveHoldbackUsd: "2.00",
        jobReference: "job_dashboard_consumer_0001"
      }
    });

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${buyerOrganizationId}/dashboard/consumer-overview?actorUserId=${financeUserId}`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      overview: {
        organizationId: buyerOrganizationId,
        actorRole: "finance",
        spendSummary: {
          lifetimeFundedUsd: "100.00",
          lifetimeSettledSpendUsd: "50.00"
        },
        balances: {
          organizationId: buyerOrganizationId,
          usageBalanceUsd: "50.00",
          spendCreditsUsd: "0.00",
          pendingEarningsUsd: "0.00",
          withdrawableCashUsd: "0.00"
        }
      }
    });
    const payload: {
      overview: {
        usageTrend: unknown[];
        latencyByModel: unknown[];
      };
    } = response.json();

    expect(payload.overview.usageTrend).toHaveLength(7);
    expect(payload.overview.latencyByModel).toEqual([]);
  });
});
