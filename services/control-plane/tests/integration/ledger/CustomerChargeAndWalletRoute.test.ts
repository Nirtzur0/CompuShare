import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { GetOrganizationWalletSummaryUseCase } from "../../../src/application/ledger/GetOrganizationWalletSummaryUseCase.js";
import { GetStagedPayoutExportUseCase } from "../../../src/application/ledger/GetStagedPayoutExportUseCase.js";
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

describe("finance customer charge and wallet routes", () => {
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

  it("records a charge and exposes wallet balances with explicit zero categories", async () => {
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
        () => new Date("2026-03-09T12:30:00.000Z")
      ),
      recordCompletedJobSettlementUseCase: {
        execute: () =>
          Promise.reject(new Error("unused finance settlement path"))
      },
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
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard path"))
      },
      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway path"))
      }
    });

    const ownerUserId = "345db7ff-1355-43c7-b333-6ae1e7246c3f";
    const organizationId = "c341ab74-a535-4139-ab2d-d2714f7df507";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        ownerUserId,
        "finance-owner@example.com",
        "Finance Owner",
        new Date("2026-03-09T11:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        organizationId,
        "Ledger Buyer Org",
        "ledger-buyer-org",
        ["buyer"],
        new Date("2026-03-09T11:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organization_members (organization_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        organizationId,
        ownerUserId,
        "finance",
        new Date("2026-03-09T11:05:00.000Z")
      ]
    );

    const chargeResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/finance/customer-charges`,
      payload: {
        actorUserId: ownerUserId,
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      }
    });

    expect(chargeResponse.statusCode).toBe(201);
    const chargePayload = chargeResponse.json<{
      transaction: {
        id: string;
        organizationId: string;
        transactionType: string;
        reference: string;
        createdByUserId: string;
        occurredAt: string;
        postings: {
          accountCode: string;
          direction: string;
          amountUsd: string;
          organizationId: string | null;
        }[];
      };
      walletSummary: {
        organizationId: string;
        usageBalanceUsd: string;
        spendCreditsUsd: string;
        pendingEarningsUsd: string;
        withdrawableCashUsd: string;
      };
    }>();
    expect(chargePayload.transaction.id).toEqual(expect.any(String));
    expect(chargePayload).toMatchObject({
      transaction: {
        organizationId,
        transactionType: "customer_charge",
        reference: "stripe_pi_123",
        createdByUserId: ownerUserId,
        occurredAt: "2026-03-09T12:30:00.000Z",
        postings: [
          {
            accountCode: "platform_cash_clearing",
            direction: "debit",
            amountUsd: "25.00",
            organizationId: null
          },
          {
            accountCode: "customer_prepaid_cash_liability",
            direction: "credit",
            amountUsd: "25.00",
            organizationId
          }
        ]
      },
      walletSummary: {
        organizationId,
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      }
    });

    const walletResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/finance/wallet?actorUserId=${ownerUserId}`
    });

    expect(walletResponse.statusCode).toBe(200);
    expect(walletResponse.json()).toEqual({
      walletSummary: {
        organizationId,
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
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
      `,
      [organizationId]
    );
    expect(ledgerTransactionRows.rows).toEqual([
      {
        transaction_type: "customer_charge",
        reference: "stripe_pi_123"
      }
    ]);

    const postingBalanceRows = await pool.query<{
      net_cents: string;
    }>(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN direction = 'debit' THEN amount_cents
                ELSE -amount_cents
              END
            ),
            0
          )::text AS net_cents
        FROM ledger_postings
        WHERE transaction_id = (
          SELECT id
          FROM ledger_transactions
          WHERE organization_id = $1
        )
      `,
      [organizationId]
    );
    expect(postingBalanceRows.rows).toEqual([{ net_cents: "0" }]);

    await app.close();
  });
});
