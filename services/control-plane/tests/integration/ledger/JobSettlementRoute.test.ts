import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
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

describe("finance job settlement route", () => {
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

  it("settles a funded job and exposes buyer and provider wallet balances", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(
        repository,
        auditLog
      ),
      issueOrganizationInvitationUseCase:
        new IssueOrganizationInvitationUseCase(repository, auditLog),
      acceptOrganizationInvitationUseCase:
        new AcceptOrganizationInvitationUseCase(repository, auditLog),
      updateOrganizationMemberRoleUseCase:
        new UpdateOrganizationMemberRoleUseCase(repository, auditLog),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog
      ),
      authenticateOrganizationApiKeyUseCase:
        new AuthenticateOrganizationApiKeyUseCase(repository, auditLog),
      recordCustomerChargeUseCase: new RecordCustomerChargeUseCase(
        repository,
        auditLog,
        () => new Date("2026-03-09T12:00:00.000Z")
      ),
      recordCompletedJobSettlementUseCase:
        new RecordCompletedJobSettlementUseCase(
          repository,
          auditLog,
          () => new Date("2026-03-09T12:45:00.000Z")
        ),
      getStagedPayoutExportUseCase: new GetStagedPayoutExportUseCase(
        repository
      ),
      getOrganizationWalletSummaryUseCase:
        new GetOrganizationWalletSummaryUseCase(repository),
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard path"))
      },
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
        repository
      ),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog
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
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },
      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway path"))
      }
    });

    const buyerUserId = "345db7ff-1355-43c7-b333-6ae1e7246c3f";
    const providerUserId = "1c05df30-7db8-46d2-b4de-40c1f90a45e0";
    const buyerOrganizationId = "c341ab74-a535-4139-ab2d-d2714f7df507";
    const providerOrganizationId = "f309659d-61c5-4c7d-b94d-55a9c2ba663c";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
      `,
      [
        buyerUserId,
        "finance-owner@example.com",
        "Finance Owner",
        new Date("2026-03-09T11:00:00.000Z"),
        providerUserId,
        "provider-finance@example.com",
        "Provider Finance",
        new Date("2026-03-09T11:01:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)
      `,
      [
        buyerOrganizationId,
        "Ledger Buyer Org",
        "ledger-buyer-org",
        ["buyer"],
        new Date("2026-03-09T11:00:00.000Z"),
        providerOrganizationId,
        "Ledger Provider Org",
        "ledger-provider-org",
        ["provider"],
        new Date("2026-03-09T11:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organization_members (organization_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
      `,
      [
        buyerOrganizationId,
        buyerUserId,
        "finance",
        new Date("2026-03-09T11:05:00.000Z"),
        providerOrganizationId,
        providerUserId,
        "finance",
        new Date("2026-03-09T11:05:00.000Z")
      ]
    );

    const fundingResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/customer-charges`,
      payload: {
        actorUserId: buyerUserId,
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(fundingResponse.statusCode).toBe(201);

    const settlementResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/job-settlements`,
      payload: {
        actorUserId: buyerUserId,
        providerOrganizationId,
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      }
    });

    expect(settlementResponse.statusCode).toBe(201);
    expect(settlementResponse.json()).toMatchObject({
      transaction: {
        organizationId: buyerOrganizationId,
        transactionType: "job_settlement",
        reference: "job_0001",
        createdByUserId: buyerUserId,
        occurredAt: "2026-03-09T12:45:00.000Z",
        postings: [
          {
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amountUsd: "10.00",
            organizationId: buyerOrganizationId
          },
          {
            accountCode: "provider_payable",
            direction: "credit",
            amountUsd: "8.50",
            organizationId: providerOrganizationId
          },
          {
            accountCode: "platform_revenue",
            direction: "credit",
            amountUsd: "1.20",
            organizationId: null
          },
          {
            accountCode: "risk_reserve",
            direction: "credit",
            amountUsd: "0.30",
            organizationId: providerOrganizationId
          }
        ]
      },
      walletSummary: {
        organizationId: buyerOrganizationId,
        usageBalanceUsd: "15.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      }
    });

    const buyerWalletResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${buyerOrganizationId}/finance/wallet?actorUserId=${buyerUserId}`
    });

    expect(buyerWalletResponse.statusCode).toBe(200);
    expect(buyerWalletResponse.json()).toEqual({
      walletSummary: {
        organizationId: buyerOrganizationId,
        usageBalanceUsd: "15.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      }
    });

    const providerWalletResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${providerOrganizationId}/finance/wallet?actorUserId=${providerUserId}`
    });

    expect(providerWalletResponse.statusCode).toBe(200);
    expect(providerWalletResponse.json()).toEqual({
      walletSummary: {
        organizationId: providerOrganizationId,
        usageBalanceUsd: "0.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "8.50",
        withdrawableCashUsd: "8.20"
      }
    });

    const payoutExportResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${buyerOrganizationId}/finance/payout-exports/staged?actorUserId=${buyerUserId}`
    });

    expect(payoutExportResponse.statusCode).toBe(200);
    expect(payoutExportResponse.json()).toEqual({
      payoutExport: {
        organizationId: buyerOrganizationId,
        entries: [
          {
            providerOrganizationId,
            settlementReference: "job_0001",
            providerPayableUsd: "8.50",
            reserveHoldbackUsd: "0.30",
            withdrawableCashUsd: "8.20"
          }
        ]
      }
    });

    const ledgerTransactionRows = await pool.query<{
      transaction_type: string;
      reference: string;
    }>(
      `
        SELECT transaction_type, reference
        FROM ledger_transactions
        WHERE organization_id = $1
        ORDER BY occurred_at ASC
      `,
      [buyerOrganizationId]
    );
    expect(ledgerTransactionRows.rows).toEqual([
      {
        transaction_type: "customer_charge",
        reference: "stripe_pi_123"
      },
      {
        transaction_type: "job_settlement",
        reference: "job_0001"
      }
    ]);
  });
});
