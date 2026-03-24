import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { CreateProviderDisputeUseCase } from "../../../src/application/dispute/CreateProviderDisputeUseCase.js";
import { ListProviderDisputesUseCase } from "../../../src/application/dispute/ListProviderDisputesUseCase.js";
import { RecordProviderDisputeAllocationsUseCase } from "../../../src/application/dispute/RecordProviderDisputeAllocationsUseCase.js";
import { TransitionProviderDisputeStatusUseCase } from "../../../src/application/dispute/TransitionProviderDisputeStatusUseCase.js";
import { GetConsumerDisputeDashboardUseCase } from "../../../src/application/dashboard/GetConsumerDisputeDashboardUseCase.js";
import { GetProviderDisputeDashboardUseCase } from "../../../src/application/dashboard/GetProviderDisputeDashboardUseCase.js";
import { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { GetOrganizationWalletSummaryUseCase } from "../../../src/application/ledger/GetOrganizationWalletSummaryUseCase.js";
import { GetStagedPayoutExportUseCase } from "../../../src/application/ledger/GetStagedPayoutExportUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../../src/application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../../src/application/ledger/RecordCustomerChargeUseCase.js";
import { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { GetProviderPayoutAvailabilityUseCase } from "../../../src/application/payout/GetProviderPayoutAvailabilityUseCase.js";
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

interface PersistedDisputeAllocationRow {
  provider_dispute_id: string;
  ordinal: number;
  provider_organization_id: string;
  amount_cents: number;
}

describe("provider dispute workflow routes", () => {
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

  it("persists settlement and chargeback disputes and nets provider payout availability by active exposure", async () => {
    const clock = () => new Date("2026-03-10T12:00:00.000Z");
    const repository = new PostgresIdentityRepository(pool, clock);
    const auditLog = new StructuredConsoleAuditLog();
    const app = buildApp({
      createOrganizationUseCase: new CreateOrganizationUseCase(repository, auditLog, clock),
      issueOrganizationInvitationUseCase: new IssueOrganizationInvitationUseCase(
        repository,
        auditLog,
        clock,
      ),
      acceptOrganizationInvitationUseCase: new AcceptOrganizationInvitationUseCase(
        repository,
        auditLog,
        clock,
      ),
      updateOrganizationMemberRoleUseCase: new UpdateOrganizationMemberRoleUseCase(
        repository,
        auditLog,
        clock,
      ),
      issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
        repository,
        repository,
        auditLog,
        clock,
      ),
      authenticateOrganizationApiKeyUseCase: new AuthenticateOrganizationApiKeyUseCase(
        repository,
        auditLog,
        clock,
      ),
      recordCustomerChargeUseCase: new RecordCustomerChargeUseCase(
        repository,
        auditLog,
        clock,
      ),
      recordCompletedJobSettlementUseCase: new RecordCompletedJobSettlementUseCase(
        repository,
        auditLog,
        clock,
      ),
      getStagedPayoutExportUseCase: new GetStagedPayoutExportUseCase(repository),
      getOrganizationWalletSummaryUseCase: new GetOrganizationWalletSummaryUseCase(
        repository,
      ),
      issueProviderPayoutOnboardingLinkUseCase: {
        execute: () =>
          Promise.reject(new Error("unused payout onboarding path")),
      },
      getProviderPayoutAccountStatusUseCase: {
        execute: () =>
          Promise.reject(new Error("unused payout account status path")),
      },
      getProviderPayoutAvailabilityUseCase: new GetProviderPayoutAvailabilityUseCase(
        repository,
      ),
      createProviderDisputeUseCase: new CreateProviderDisputeUseCase(
        repository,
        auditLog,
        clock,
      ),
      listProviderDisputesUseCase: new ListProviderDisputesUseCase(repository),
      recordProviderDisputeAllocationsUseCase:
        new RecordProviderDisputeAllocationsUseCase(
          repository,
          auditLog,
          clock,
        ),
      transitionProviderDisputeStatusUseCase:
        new TransitionProviderDisputeStatusUseCase(repository, auditLog, clock),
      getConsumerDisputeDashboardUseCase: new GetConsumerDisputeDashboardUseCase(
        repository,
        auditLog,
        clock,
      ),
      getConsumerDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused consumer dashboard overview path")),
      },
      getProviderDashboardOverviewUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider dashboard overview path")),
      },
      getProviderDisputeDashboardUseCase: new GetProviderDisputeDashboardUseCase(
        repository,
        auditLog,
        clock,
      ),
      listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(repository),
      resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
        repository,
        auditLog,
        clock,
      ),
      enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
        repository,
        auditLog,
        clock,
      ),
      recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
        repository,
        auditLog,
        clock,
      ),
      listProviderInventoryUseCase: new ListProviderInventoryUseCase(repository),
      getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(repository),
      issueProviderNodeAttestationChallengeUseCase: {
        execute: () =>
          Promise.reject(
            new Error("unused provider attestation challenge path"),
          ),
      },
      submitProviderNodeAttestationUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider attestation submit path")),
      },
      upsertProviderNodeRoutingProfileUseCase: new UpsertProviderNodeRoutingProfileUseCase(
        repository,
        auditLog,
        clock,
      ),
      listProviderBenchmarkHistoryUseCase: new ListProviderBenchmarkHistoryUseCase(
        repository,
      ),
      admitProviderRuntimeWorkloadBundleUseCase: {
        execute: () =>
          Promise.reject(new Error("unused provider runtime admission path")),
      },
      executeChatCompletionUseCase: {
        execute: () => Promise.reject(new Error("unused gateway path")),
      },
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
        new Date("2026-03-09T11:01:00.000Z"),
      ],
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
        new Date("2026-03-09T11:00:00.000Z"),
      ],
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
        new Date("2026-03-09T11:05:00.000Z"),
      ],
    );

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/customer-charges`,
      payload: {
        actorUserId: buyerUserId,
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123",
      },
    });
    await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/job-settlements`,
      payload: {
        actorUserId: buyerUserId,
        providerOrganizationId,
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001",
      },
    });

    const settlementDisputeResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/provider-disputes`,
      payload: {
        actorUserId: buyerUserId,
        disputeType: "settlement",
        providerOrganizationId,
        jobReference: "job_0001",
        disputedAmountUsd: "4.00",
        reasonCode: "quality_miss",
        summary: "Provider missed the agreed latency target.",
        evidenceEntries: [
          {
            label: "log_excerpt",
            value: "p95 latency exceeded the buyer-approved SLA window",
          },
        ],
      },
    });
    const chargebackResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/provider-disputes`,
      payload: {
        actorUserId: buyerUserId,
        disputeType: "chargeback",
        paymentReference: "stripe_pi_123",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        evidenceEntries: [
          {
            label: "issuer_note",
            value: "Cardholder claims unauthorized use.",
          },
        ],
      },
    });

    expect(settlementDisputeResponse.statusCode).toBe(201);
    expect(chargebackResponse.statusCode).toBe(201);

    const chargebackId = chargebackResponse.json<{ dispute: { id: string } }>().dispute.id;
    const settlementDisputeId =
      settlementDisputeResponse.json<{ dispute: { id: string } }>().dispute.id;
    const allocationResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/provider-disputes/${chargebackId}/allocations`,
      payload: {
        actorUserId: buyerUserId,
        allocations: [
          {
            providerOrganizationId,
            amountUsd: "2.50",
          },
        ],
      },
    });

    expect(allocationResponse.statusCode).toBe(200);

    const persistedDisputes = await pool.query(
      `
        SELECT
          id::text AS id,
          dispute_type,
          payment_reference,
          job_reference
        FROM provider_dispute_cases
        ORDER BY id ASC
      `
    );
    const persistedAllocations = await pool.query<PersistedDisputeAllocationRow>(
      `
        SELECT
          provider_dispute_id::text AS provider_dispute_id,
          ordinal,
          provider_organization_id::text AS provider_organization_id,
          amount_cents
        FROM provider_dispute_allocations
        ORDER BY provider_dispute_id ASC, ordinal ASC
      `
    );
    // Keep the raw persistence shape visible while the dispute register is new.
    expect(persistedDisputes.rows).toHaveLength(2);
    expect(persistedAllocations.rows).toHaveLength(2);
    expect(
      persistedAllocations.rows.filter(
        (row) => row.provider_dispute_id === settlementDisputeId,
      ),
    ).toEqual([
      {
        provider_dispute_id: settlementDisputeId,
        ordinal: 0,
        provider_organization_id: providerOrganizationId,
        amount_cents: 400,
      },
    ]);
    expect(
      persistedAllocations.rows.filter((row) => row.provider_dispute_id === chargebackId),
    ).toEqual([
      {
        provider_dispute_id: chargebackId,
        ordinal: 0,
        provider_organization_id: providerOrganizationId,
        amount_cents: 250,
      },
    ]);
    expect(
      await repository.listBuyerOrganizationDisputes({
        buyerOrganizationId: OrganizationId.create(buyerOrganizationId),
      }),
    ).toHaveLength(2);

    const payoutAvailabilityResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${providerOrganizationId}/finance/provider-payout-availability?actorUserId=${providerUserId}`,
    });
    const consumerDashboardResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${buyerOrganizationId}/dashboard/consumer-disputes?actorUserId=${buyerUserId}`,
    });
    const providerDashboardResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${providerOrganizationId}/dashboard/provider-disputes?actorUserId=${providerUserId}`,
    });

    expect(payoutAvailabilityResponse.statusCode).toBe(200);
    expect(payoutAvailabilityResponse.json()).toMatchObject({
      payoutAvailability: {
        withdrawableCashUsd: "8.20",
        activeDisputeHoldUsd: "6.50",
        eligiblePayoutUsd: "1.70",
      },
    });
    expect(consumerDashboardResponse.json()).toMatchObject({
      dashboard: {
        activeDisputeCount: 2,
        activeDisputeHoldUsd: "6.50",
      },
    });
    expect(providerDashboardResponse.json()).toMatchObject({
      dashboard: {
        activeDisputeCount: 2,
        activeDisputeHoldUsd: "6.50",
      },
    });

    const wonResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyerOrganizationId}/finance/provider-disputes/${settlementDisputeId}/status`,
      payload: {
        actorUserId: buyerUserId,
        nextStatus: "won",
      },
    });
    const updatedPayoutAvailabilityResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${providerOrganizationId}/finance/provider-payout-availability?actorUserId=${providerUserId}`,
    });
    const updatedProviderDashboardResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${providerOrganizationId}/dashboard/provider-disputes?actorUserId=${providerUserId}`,
    });

    expect(wonResponse.statusCode).toBe(200);
    expect(updatedPayoutAvailabilityResponse.json()).toMatchObject({
      payoutAvailability: {
        activeDisputeHoldUsd: "2.50",
        eligiblePayoutUsd: "5.70",
      },
    });
    expect(updatedProviderDashboardResponse.json()).toMatchObject({
      dashboard: {
        activeDisputeHoldUsd: "2.50",
      },
    });

    await app.close();
  });
});
