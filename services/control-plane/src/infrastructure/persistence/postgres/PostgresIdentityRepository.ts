import type { Pool, PoolClient, QueryResult } from "pg";
import type { ConsumerDashboardRepository } from "../../../application/dashboard/ports/ConsumerDashboardRepository.js";
import type { ProviderDashboardRepository } from "../../../application/dashboard/ports/ProviderDashboardRepository.js";
import type { OrganizationLedgerRepository } from "../../../application/ledger/ports/OrganizationLedgerRepository.js";
import type { OrganizationApiKeyRepository } from "../../../application/identity/ports/OrganizationApiKeyRepository.js";
import type { OrganizationInvitationRepository } from "../../../application/identity/ports/OrganizationInvitationRepository.js";
import type { OrganizationMembershipRepository } from "../../../application/identity/ports/OrganizationMembershipRepository.js";
import type { OrganizationProvisioningRepository } from "../../../application/identity/ports/OrganizationProvisioningRepository.js";
import type { PlacementCandidateRepository } from "../../../application/placement/ports/PlacementCandidateRepository.js";
import type { SyncPlacementRepository } from "../../../application/placement/ports/SyncPlacementRepository.js";
import type { ProviderBenchmarkRepository } from "../../../application/provider/ports/ProviderBenchmarkRepository.js";
import type { ProviderInventoryRepository } from "../../../application/provider/ports/ProviderInventoryRepository.js";
import type { ProviderNodeEnrollmentRepository } from "../../../application/provider/ports/ProviderNodeEnrollmentRepository.js";
import type { ProviderRoutingProfileRepository } from "../../../application/provider/ports/ProviderRoutingProfileRepository.js";
import type { GatewayUsageMeterEventRepository } from "../../../application/metering/ports/GatewayUsageMeterEventRepository.js";
import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { EmailAddress } from "../../../domain/identity/EmailAddress.js";
import { OrganizationApiKey } from "../../../domain/identity/OrganizationApiKey.js";
import type { OrganizationApiKeyId } from "../../../domain/identity/OrganizationApiKeyId.js";
import { parseOrganizationApiKeyEnvironment } from "../../../domain/identity/OrganizationApiKeyEnvironment.js";
import type { Organization } from "../../../domain/identity/Organization.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import { OrganizationInvitation } from "../../../domain/identity/OrganizationInvitation.js";
import { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationSlug } from "../../../domain/identity/OrganizationSlug.js";
import { parseOrganizationRole } from "../../../domain/identity/OrganizationRole.js";
import { User } from "../../../domain/identity/User.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import { ConsumerSpendSummary } from "../../../domain/dashboard/ConsumerSpendSummary.js";
import type { LedgerTransaction } from "../../../domain/ledger/LedgerTransaction.js";
import { OrganizationWalletSummary } from "../../../domain/ledger/OrganizationWalletSummary.js";
import { StagedPayoutExport } from "../../../domain/ledger/StagedPayoutExport.js";
import { StagedPayoutExportEntry } from "../../../domain/ledger/StagedPayoutExportEntry.js";
import { UsdAmount } from "../../../domain/ledger/UsdAmount.js";
import type { GatewayUsageMeterEvent } from "../../../domain/metering/GatewayUsageMeterEvent.js";
import type {
  PlacementDecisionLog,
  PlacementDecisionLogSnapshot
} from "../../../domain/placement/PlacementDecisionLog.js";
import {
  ProviderBenchmarkReport,
  type ProviderBenchmarkReportSnapshot
} from "../../../domain/provider/ProviderBenchmarkReport.js";
import { ProviderInventorySummary } from "../../../domain/provider/ProviderInventorySummary.js";
import type { ProviderMachineId } from "../../../domain/provider/ProviderMachineId.js";
import type { ProviderNodeId } from "../../../domain/provider/ProviderNodeId.js";
import { ProviderNode } from "../../../domain/provider/ProviderNode.js";
import { ProviderNodeRoutingProfile } from "../../../domain/provider/ProviderNodeRoutingProfile.js";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  created_at: Date;
}

interface ExistsRow {
  slug: string;
}

interface OrganizationMemberRow {
  user_id: string;
  role: string;
  joined_at: Date;
}

interface OrganizationInvitationRow {
  id: string;
  organization_id: string;
  invitee_email: string;
  role: string;
  invited_by_user_id: string;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  accepted_at: Date | null;
  accepted_by_user_id: string | null;
}

interface PendingInvitationRow {
  id: string;
}

interface OrganizationApiKeyRow {
  id: string;
  organization_id: string;
  label: string;
  environment: string;
  secret_hash: string;
  secret_prefix: string;
  issued_by_user_id: string;
  created_at: Date;
  last_used_at: Date | null;
}

interface OrganizationCapabilitiesRow {
  account_capabilities: string[];
}

interface ProviderNodeRow {
  id: string;
  organization_id: string;
  machine_id: string;
  label: string;
  runtime: string;
  region: string;
  hostname: string;
  trust_tier: string;
  health_state: string;
  driver_version: string;
  endpoint_url: string | null;
  price_floor_usd_per_hour: number | null;
  routing_profile_updated_at: Date | null;
  enrolled_at: Date;
}

interface ProviderNodeGpuRow {
  provider_node_id: string;
  model: string;
  vram_gb: number;
  gpu_count: number;
  interconnect: string | null;
}

interface ProviderNodeBenchmarkRow {
  id: string;
  provider_node_id: string;
  gpu_class: string;
  vram_gb: number;
  throughput_tokens_per_second: number;
  driver_version: string;
  recorded_at: Date;
}

interface PlacementDecisionLogRow {
  id: string;
  organization_id: string;
  environment: string;
  gpu_class: string;
  min_vram_gb: number;
  region: string;
  minimum_trust_tier: string;
  max_price_usd_per_hour: number;
  candidate_count: number;
  selected_provider_node_id: string | null;
  selected_provider_organization_id: string | null;
  rejection_reason: string | null;
  created_at: Date;
}

interface LedgerAccountBalanceRow {
  account_code: string;
  balance_cents: string;
}

interface ConsumerSpendSummaryRow {
  lifetime_funded_cents: string;
  lifetime_settled_spend_cents: string;
}

interface StagedPayoutExportRow {
  provider_organization_id: string;
  settlement_reference: string;
  provider_payable_cents: string;
  reserve_holdback_cents: string;
}

interface ProviderEarningsTrendRow {
  occurred_at: Date;
  provider_payable_cents: string;
  reserve_holdback_cents: string;
}

interface GatewayUsageMeterEventRow {
  occurred_at: Date;
  approved_model_alias: string;
  total_tokens: number;
  latency_ms: number;
}

export class PostgresIdentityRepository
  implements
    ConsumerDashboardRepository,
    ProviderDashboardRepository,
    GatewayUsageMeterEventRepository,
    OrganizationLedgerRepository,
    OrganizationProvisioningRepository,
    OrganizationInvitationRepository,
    OrganizationMembershipRepository,
    OrganizationApiKeyRepository,
    PlacementCandidateRepository,
    SyncPlacementRepository,
    ProviderNodeEnrollmentRepository,
    ProviderBenchmarkRepository,
    ProviderInventoryRepository,
    ProviderRoutingProfileRepository
{
  public constructor(private readonly pool: Pick<Pool, "connect" | "query">) {}

  public async findUserByEmail(email: EmailAddress): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `
        SELECT id, email, display_name, created_at
        FROM users
        WHERE email = $1
      `,
      [email.value]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return User.rehydrate({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      createdAt: row.created_at
    });
  }

  public async organizationSlugExists(
    slug: OrganizationSlug
  ): Promise<boolean> {
    const result = await this.pool.query<ExistsRow>(
      `
        SELECT slug
        FROM organizations
        WHERE slug = $1
      `,
      [slug.value]
    );

    return (result.rowCount ?? 0) > 0;
  }

  public async createOrganization(
    organization: Organization,
    founder: User
  ): Promise<User> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const persistedFounder = await this.upsertFounder(client, founder);

      await client.query(
        `
          INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          organization.id.value,
          organization.name.value,
          organization.slug.value,
          organization.accountProfile.toArray(),
          organization.createdAt
        ]
      );

      await client.query(
        `
          INSERT INTO organization_members (organization_id, user_id, role, joined_at)
          VALUES ($1, $2, $3, $4)
        `,
        [
          organization.id.value,
          persistedFounder.id.value,
          "owner",
          organization.createdAt
        ]
      );

      await client.query("COMMIT");
      return persistedFounder;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null> {
    const result = await this.pool.query<OrganizationMemberRow>(
      `
        SELECT user_id, role, joined_at
        FROM organization_members
        WHERE organization_id = $1 AND user_id = $2
      `,
      [organizationId.value, userId.value]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return OrganizationMember.rehydrate({
      userId: row.user_id,
      role: parseOrganizationRole(row.role),
      joinedAt: row.joined_at
    });
  }

  public async pendingInvitationExists(
    organizationId: OrganizationId,
    inviteeEmail: EmailAddress
  ): Promise<boolean> {
    const result = await this.pool.query<PendingInvitationRow>(
      `
        SELECT id
        FROM organization_invitations
        WHERE organization_id = $1
          AND invitee_email = $2
          AND accepted_at IS NULL
          AND expires_at > NOW()
      `,
      [organizationId.value, inviteeEmail.value]
    );

    return (result.rowCount ?? 0) > 0;
  }

  public async countOrganizationOwners(
    organizationId: OrganizationId
  ): Promise<number> {
    const result = await this.pool.query<{ owner_count: string }>(
      `
        SELECT COUNT(*)::text AS owner_count
        FROM organization_members
        WHERE organization_id = $1 AND role = 'owner'
      `,
      [organizationId.value]
    );

    const row = result.rows[0];

    if (!row) {
      return 0;
    }

    return Number.parseInt(row.owner_count, 10);
  }

  public async updateOrganizationMemberRole(
    organizationId: OrganizationId,
    userId: UserId,
    nextRole: ReturnType<typeof parseOrganizationRole>
  ): Promise<OrganizationMember> {
    const result = await this.pool.query<OrganizationMemberRow>(
      `
        UPDATE organization_members
        SET role = $3
        WHERE organization_id = $1 AND user_id = $2
        RETURNING user_id, role, joined_at
      `,
      [organizationId.value, userId.value, nextRole]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Expected an updated organization member row.");
    }

    return OrganizationMember.rehydrate({
      userId: row.user_id,
      role: parseOrganizationRole(row.role),
      joinedAt: row.joined_at
    });
  }

  public async createInvitation(
    invitation: OrganizationInvitation
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO organization_invitations (
          id,
          organization_id,
          invitee_email,
          role,
          invited_by_user_id,
          token_hash,
          created_at,
          expires_at,
          accepted_at,
          accepted_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        invitation.id.value,
        invitation.organizationId.value,
        invitation.inviteeEmail.value,
        invitation.role,
        invitation.invitedByUserId.value,
        invitation.tokenHash,
        invitation.createdAt,
        invitation.expiresAt,
        invitation.acceptedAt,
        invitation.acceptedByUserId?.value ?? null
      ]
    );
  }

  public async findPendingInvitationByTokenHash(
    tokenHash: string
  ): Promise<OrganizationInvitation | null> {
    const result = await this.pool.query<OrganizationInvitationRow>(
      `
        SELECT
          id,
          organization_id,
          invitee_email,
          role,
          invited_by_user_id,
          token_hash,
          created_at,
          expires_at,
          accepted_at,
          accepted_by_user_id
        FROM organization_invitations
        WHERE token_hash = $1
          AND accepted_at IS NULL
      `,
      [tokenHash]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return OrganizationInvitation.rehydrate({
      id: row.id,
      organizationId: row.organization_id,
      inviteeEmail: row.invitee_email,
      role: row.role,
      invitedByUserId: row.invited_by_user_id,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      acceptedByUserId: row.accepted_by_user_id
    });
  }

  public async acceptInvitation(
    invitation: OrganizationInvitation,
    user: User,
    acceptedAt: Date
  ): Promise<User> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const persistedUser = await this.upsertFounder(client, user);

      await client.query(
        `
          INSERT INTO organization_members (organization_id, user_id, role, joined_at)
          VALUES ($1, $2, $3, $4)
        `,
        [
          invitation.organizationId.value,
          persistedUser.id.value,
          invitation.role,
          acceptedAt
        ]
      );

      await client.query(
        `
          UPDATE organization_invitations
          SET accepted_at = $2, accepted_by_user_id = $3
          WHERE id = $1
        `,
        [invitation.id.value, acceptedAt, persistedUser.id.value]
      );

      await client.query("COMMIT");
      return persistedUser;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async createOrganizationApiKey(
    apiKey: OrganizationApiKey
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO organization_api_keys (
          id,
          organization_id,
          label,
          environment,
          secret_hash,
          secret_prefix,
          issued_by_user_id,
          created_at,
          last_used_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        apiKey.id.value,
        apiKey.organizationId.value,
        apiKey.label.value,
        apiKey.environment,
        apiKey.secretHash,
        apiKey.secretPrefix,
        apiKey.issuedByUserId.value,
        apiKey.createdAt,
        apiKey.lastUsedAt
      ]
    );
  }

  public async findOrganizationApiKeyBySecretHash(
    secretHash: string
  ): Promise<OrganizationApiKey | null> {
    const result = await this.pool.query<OrganizationApiKeyRow>(
      `
        SELECT
          id,
          organization_id,
          label,
          environment,
          secret_hash,
          secret_prefix,
          issued_by_user_id,
          created_at,
          last_used_at
        FROM organization_api_keys
        WHERE secret_hash = $1
      `,
      [secretHash]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return OrganizationApiKey.rehydrate({
      id: row.id,
      organizationId: row.organization_id,
      label: row.label,
      environment: parseOrganizationApiKeyEnvironment(row.environment),
      secretHash: row.secret_hash,
      secretPrefix: row.secret_prefix,
      issuedByUserId: row.issued_by_user_id,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at
    });
  }

  public async recordOrganizationApiKeyUsage(
    apiKeyId: OrganizationApiKeyId,
    usedAt: Date
  ): Promise<void> {
    await this.pool.query(
      `
        UPDATE organization_api_keys
        SET last_used_at = $2
        WHERE id = $1
      `,
      [apiKeyId.value, usedAt]
    );
  }

  public async findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null> {
    const result = await this.pool.query<OrganizationCapabilitiesRow>(
      `
        SELECT account_capabilities
        FROM organizations
        WHERE id = $1
      `,
      [organizationId.value]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return row.account_capabilities as AccountCapability[];
  }

  public async appendLedgerTransaction(
    transaction: LedgerTransaction
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO ledger_transactions (
            id,
            organization_id,
            transaction_type,
            reference,
            created_by_user_id,
            occurred_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          transaction.id,
          transaction.organizationId.value,
          transaction.transactionType,
          transaction.reference,
          transaction.createdByUserId.value,
          transaction.occurredAt
        ]
      );

      for (const [index, posting] of transaction.postings.entries()) {
        await client.query(
          `
            INSERT INTO ledger_postings (
              transaction_id,
              ordinal,
              organization_id,
              account_code,
              direction,
              amount_cents
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            transaction.id,
            index,
            posting.organizationId?.value ?? null,
            posting.accountCode,
            posting.direction,
            posting.amount.cents
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async getOrganizationWalletSummary(
    organizationId: OrganizationId
  ): Promise<OrganizationWalletSummary> {
    const result = await this.pool.query<LedgerAccountBalanceRow>(
      `
        SELECT
          account_code,
          COALESCE(
            SUM(
              CASE
                WHEN direction = 'credit' THEN amount_cents
                ELSE -amount_cents
              END
            ),
            0
          )::text AS balance_cents
        FROM ledger_postings
        WHERE organization_id = $1
        GROUP BY account_code
      `,
      [organizationId.value]
    );

    const balances = new Map<string, number>();

    for (const row of result.rows) {
      balances.set(row.account_code, Number.parseInt(row.balance_cents, 10));
    }

    const pendingEarningsCents = Math.max(
      balances.get("provider_payable") ?? 0,
      0
    );
    const reserveHoldbackCents = Math.max(balances.get("risk_reserve") ?? 0, 0);

    return OrganizationWalletSummary.create({
      organizationId: organizationId.value,
      usageBalanceCents: Math.max(
        balances.get("customer_prepaid_cash_liability") ?? 0,
        0
      ),
      spendCreditsCents: Math.max(
        balances.get("customer_promotional_credit_liability") ?? 0,
        0
      ),
      pendingEarningsCents,
      withdrawableCashCents: Math.max(
        pendingEarningsCents - reserveHoldbackCents,
        0
      )
    });
  }

  public async getConsumerSpendSummary(
    organizationId: OrganizationId
  ): Promise<ConsumerSpendSummary> {
    const result = await this.pool.query<ConsumerSpendSummaryRow>(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN ledger_transactions.transaction_type = 'customer_charge'
                  AND ledger_postings.account_code = 'customer_prepaid_cash_liability'
                  AND ledger_postings.direction = 'credit'
                  THEN ledger_postings.amount_cents
                ELSE 0
              END
            ),
            0
          )::text AS lifetime_funded_cents,
          COALESCE(
            SUM(
              CASE
                WHEN ledger_transactions.transaction_type = 'job_settlement'
                  AND ledger_postings.account_code = 'customer_prepaid_cash_liability'
                  AND ledger_postings.direction = 'debit'
                  THEN ledger_postings.amount_cents
                ELSE 0
              END
            ),
            0
          )::text AS lifetime_settled_spend_cents
        FROM ledger_transactions
        INNER JOIN ledger_postings
          ON ledger_postings.transaction_id = ledger_transactions.id
        WHERE ledger_transactions.organization_id = $1
          AND ledger_postings.organization_id = $1
      `,
      [organizationId.value]
    );

    return ConsumerSpendSummary.create({
      lifetimeFundedCents: Number.parseInt(
        result.rows[0]?.lifetime_funded_cents ?? "0",
        10
      ),
      lifetimeSettledSpendCents: Number.parseInt(
        result.rows[0]?.lifetime_settled_spend_cents ?? "0",
        10
      )
    });
  }

  public async getStagedPayoutExport(
    organizationId: OrganizationId
  ): Promise<StagedPayoutExport> {
    const result = await this.pool.query<StagedPayoutExportRow>(
      `
        SELECT
          provider_posting.organization_id AS provider_organization_id,
          ledger_transactions.reference AS settlement_reference,
          COALESCE(
            SUM(
              CASE
                WHEN provider_posting.direction = 'credit'
                  THEN provider_posting.amount_cents
                ELSE -provider_posting.amount_cents
              END
            ),
            0
          )::text AS provider_payable_cents,
          COALESCE(
            SUM(
              CASE
                WHEN reserve_posting.direction = 'credit'
                  THEN reserve_posting.amount_cents
                ELSE -reserve_posting.amount_cents
              END
            ),
            0
          )::text AS reserve_holdback_cents
        FROM ledger_transactions
        INNER JOIN ledger_postings AS provider_posting
          ON provider_posting.transaction_id = ledger_transactions.id
         AND provider_posting.account_code = 'provider_payable'
        LEFT JOIN ledger_postings AS reserve_posting
          ON reserve_posting.transaction_id = ledger_transactions.id
         AND reserve_posting.account_code = 'risk_reserve'
         AND reserve_posting.organization_id = provider_posting.organization_id
        WHERE ledger_transactions.organization_id = $1
          AND ledger_transactions.transaction_type = 'job_settlement'
        GROUP BY
          ledger_transactions.id,
          ledger_transactions.occurred_at,
          ledger_transactions.reference,
          provider_posting.organization_id
        ORDER BY
          ledger_transactions.occurred_at ASC,
          ledger_transactions.reference ASC,
          provider_posting.organization_id ASC
      `,
      [organizationId.value]
    );

    return StagedPayoutExport.create({
      organizationId: organizationId.value,
      entries: result.rows.map((row) =>
        StagedPayoutExportEntry.create({
          providerOrganizationId: row.provider_organization_id,
          settlementReference: row.settlement_reference,
          providerPayableCents: Number.parseInt(row.provider_payable_cents, 10),
          reserveHoldbackCents: Number.parseInt(row.reserve_holdback_cents, 10)
        })
      )
    });
  }

  public async appendGatewayUsageMeterEvent(
    event: GatewayUsageMeterEvent
  ): Promise<void> {
    const snapshot = event.toSnapshot();

    await this.pool.query(
      `
        INSERT INTO gateway_usage_meter_events (
          workload_bundle_id,
          occurred_at,
          customer_organization_id,
          provider_organization_id,
          provider_node_id,
          environment,
          approved_model_alias,
          manifest_id,
          decision_log_id,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          latency_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        snapshot.workloadBundleId,
        snapshot.occurredAt,
        snapshot.customerOrganizationId,
        snapshot.providerOrganizationId,
        snapshot.providerNodeId,
        snapshot.environment,
        snapshot.approvedModelAlias,
        snapshot.manifestId,
        snapshot.decisionLogId,
        snapshot.promptTokens,
        snapshot.completionTokens,
        snapshot.totalTokens,
        snapshot.latencyMs
      ]
    );
  }

  public async listProviderDailyEarningsTrend(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      date: string;
      earnings: UsdAmount;
      reserveHoldback: UsdAmount;
    }[]
  > {
    const result = await this.pool.query<ProviderEarningsTrendRow>(
      `
        SELECT
          ledger_transactions.occurred_at,
          provider_posting.amount_cents::text AS provider_payable_cents,
          COALESCE(reserve_posting.amount_cents, 0)::text AS reserve_holdback_cents
        FROM ledger_transactions
        INNER JOIN ledger_postings AS provider_posting
          ON provider_posting.transaction_id = ledger_transactions.id
         AND provider_posting.account_code = 'provider_payable'
         AND provider_posting.direction = 'credit'
         AND provider_posting.organization_id = $1
        LEFT JOIN ledger_postings AS reserve_posting
          ON reserve_posting.transaction_id = ledger_transactions.id
         AND reserve_posting.account_code = 'risk_reserve'
         AND reserve_posting.direction = 'credit'
         AND reserve_posting.organization_id = $1
        WHERE ledger_transactions.transaction_type = 'job_settlement'
          AND ledger_transactions.occurred_at >= $2
          AND ledger_transactions.occurred_at < $3
        ORDER BY ledger_transactions.occurred_at ASC
      `,
      [
        input.organizationId.value,
        input.startDateInclusive.toISOString(),
        input.endDateExclusive.toISOString()
      ]
    );

    const totalsByDate = new Map<
      string,
      {
        earningsCents: number;
        reserveHoldbackCents: number;
      }
    >();

    for (const row of result.rows) {
      const date = this.toUtcDateKey(row.occurred_at);
      const current = totalsByDate.get(date) ?? {
        earningsCents: 0,
        reserveHoldbackCents: 0
      };

      current.earningsCents += Number.parseInt(row.provider_payable_cents, 10);
      current.reserveHoldbackCents += Number.parseInt(
        row.reserve_holdback_cents,
        10
      );
      totalsByDate.set(date, current);
    }

    return Array.from(totalsByDate.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, totals]) => ({
        date,
        earnings: UsdAmount.createFromCents(totals.earningsCents),
        reserveHoldback: UsdAmount.createFromCents(totals.reserveHoldbackCents)
      }));
  }

  public async listProviderDailyTokenUsageTrend(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      date: string;
      totalTokens: number;
    }[]
  > {
    const result = await this.pool.query<GatewayUsageMeterEventRow>(
      `
        SELECT occurred_at, approved_model_alias, total_tokens, latency_ms
        FROM gateway_usage_meter_events
        WHERE provider_organization_id = $1
          AND occurred_at >= $2
          AND occurred_at < $3
        ORDER BY occurred_at ASC
      `,
      [
        input.organizationId.value,
        input.startDateInclusive.toISOString(),
        input.endDateExclusive.toISOString()
      ]
    );

    const totalsByDate = new Map<string, number>();

    for (const row of result.rows) {
      const date = this.toUtcDateKey(row.occurred_at);
      totalsByDate.set(date, (totalsByDate.get(date) ?? 0) + row.total_tokens);
    }

    return Array.from(totalsByDate.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, totalTokens]) => ({
        date,
        totalTokens
      }));
  }

  public async listConsumerDailyUsageTrend(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      date: string;
      requestCount: number;
      totalTokens: number;
    }[]
  > {
    const result = await this.pool.query<GatewayUsageMeterEventRow>(
      `
        SELECT occurred_at, approved_model_alias, total_tokens, latency_ms
        FROM gateway_usage_meter_events
        WHERE customer_organization_id = $1
          AND occurred_at >= $2
          AND occurred_at < $3
        ORDER BY occurred_at ASC
      `,
      [
        input.organizationId.value,
        input.startDateInclusive.toISOString(),
        input.endDateExclusive.toISOString()
      ]
    );

    const totalsByDate = new Map<
      string,
      {
        requestCount: number;
        totalTokens: number;
      }
    >();

    for (const row of result.rows) {
      const date = this.toUtcDateKey(row.occurred_at);
      const current = totalsByDate.get(date) ?? {
        requestCount: 0,
        totalTokens: 0
      };

      current.requestCount += 1;
      current.totalTokens += row.total_tokens;
      totalsByDate.set(date, current);
    }

    return Array.from(totalsByDate.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, totals]) => ({
        date,
        requestCount: totals.requestCount,
        totalTokens: totals.totalTokens
      }));
  }

  public async listConsumerLatencyByModel(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      modelAlias: string;
      requestCount: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      totalTokens: number;
    }[]
  > {
    const result = await this.pool.query<GatewayUsageMeterEventRow>(
      `
        SELECT occurred_at, approved_model_alias, total_tokens, latency_ms
        FROM gateway_usage_meter_events
        WHERE customer_organization_id = $1
          AND occurred_at >= $2
          AND occurred_at < $3
        ORDER BY occurred_at ASC
      `,
      [
        input.organizationId.value,
        input.startDateInclusive.toISOString(),
        input.endDateExclusive.toISOString()
      ]
    );

    const metricsByModel = new Map<
      string,
      {
        requestCount: number;
        totalTokens: number;
        totalLatencyMs: number;
        latencies: number[];
      }
    >();

    for (const row of result.rows) {
      const current = metricsByModel.get(row.approved_model_alias) ?? {
        requestCount: 0,
        totalTokens: 0,
        totalLatencyMs: 0,
        latencies: []
      };

      current.requestCount += 1;
      current.totalTokens += row.total_tokens;
      current.totalLatencyMs += row.latency_ms;
      current.latencies.push(row.latency_ms);
      metricsByModel.set(row.approved_model_alias, current);
    }

    return Array.from(metricsByModel.entries())
      .map(([modelAlias, metrics]) => ({
        modelAlias,
        requestCount: metrics.requestCount,
        avgLatencyMs:
          metrics.requestCount === 0
            ? 0
            : this.roundToTwoDecimals(
                metrics.totalLatencyMs / metrics.requestCount
              ),
        p95LatencyMs: this.calculateP95(metrics.latencies),
        totalTokens: metrics.totalTokens
      }))
      .sort(
        (left, right) =>
          right.totalTokens - left.totalTokens ||
          left.modelAlias.localeCompare(right.modelAlias)
      );
  }

  public async providerNodeMachineIdExists(
    organizationId: OrganizationId,
    machineId: ProviderMachineId
  ): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
        SELECT id
        FROM provider_nodes
        WHERE organization_id = $1 AND machine_id = $2
      `,
      [organizationId.value, machineId.value]
    );

    return (result.rowCount ?? 0) > 0;
  }

  public async createProviderNode(providerNode: ProviderNode): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO provider_nodes (
            id,
            organization_id,
            machine_id,
            label,
            runtime,
            region,
            hostname,
            trust_tier,
            health_state,
            driver_version,
            enrolled_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          providerNode.id.value,
          providerNode.organizationId.value,
          providerNode.machineId.value,
          providerNode.label.value,
          providerNode.runtime,
          providerNode.region.value,
          providerNode.hostname.value,
          providerNode.trustTier,
          providerNode.healthState,
          providerNode.inventory.driverVersion,
          providerNode.enrolledAt
        ]
      );

      for (const [index, gpu] of providerNode.inventory.items.entries()) {
        await client.query(
          `
            INSERT INTO provider_node_gpus (
              provider_node_id,
              ordinal,
              model,
              vram_gb,
              gpu_count,
              interconnect
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            providerNode.id.value,
            index,
            gpu.model,
            gpu.vramGb,
            gpu.count,
            gpu.interconnect
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  public async upsertProviderNodeRoutingProfile(
    routingProfile: ProviderNodeRoutingProfile
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO provider_node_routing_profiles (
          provider_node_id,
          endpoint_url,
          price_floor_usd_per_hour,
          updated_at
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (provider_node_id) DO UPDATE
        SET endpoint_url = EXCLUDED.endpoint_url,
            price_floor_usd_per_hour = EXCLUDED.price_floor_usd_per_hour,
            updated_at = EXCLUDED.updated_at
      `,
      [
        routingProfile.providerNodeId.value,
        routingProfile.endpointUrl.value,
        routingProfile.priceFloorUsdPerHour.value,
        routingProfile.updatedAt
      ]
    );
  }

  public async providerNodeExists(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `
        SELECT id
        FROM provider_nodes
        WHERE organization_id = $1 AND id = $2
      `,
      [organizationId.value, providerNodeId.value]
    );

    return (result.rowCount ?? 0) > 0;
  }

  public async listProviderBenchmarkReports(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<readonly ProviderBenchmarkReport[]> {
    const result = await this.pool.query<ProviderNodeBenchmarkRow>(
      `
        SELECT
          b.id,
          b.provider_node_id,
          b.gpu_class,
          b.vram_gb,
          b.throughput_tokens_per_second,
          b.driver_version,
          b.recorded_at
        FROM provider_node_benchmarks AS b
        INNER JOIN provider_nodes AS n ON n.id = b.provider_node_id
        WHERE n.organization_id = $1
          AND b.provider_node_id = $2
        ORDER BY b.recorded_at DESC, b.benchmark_sequence DESC
      `,
      [organizationId.value, providerNodeId.value]
    );

    return result.rows.map((row) =>
      ProviderBenchmarkReport.rehydrate({
        id: row.id,
        providerNodeId: row.provider_node_id,
        gpuClass: row.gpu_class,
        vramGb: row.vram_gb,
        throughputTokensPerSecond: row.throughput_tokens_per_second,
        driverVersion: row.driver_version,
        recordedAt: row.recorded_at
      })
    );
  }

  public async createProviderBenchmarkReport(
    benchmarkReport: ProviderBenchmarkReport
  ): Promise<void> {
    await this.pool.query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        benchmarkReport.id.value,
        benchmarkReport.providerNodeId.value,
        benchmarkReport.gpuClass.value,
        benchmarkReport.vramGb,
        benchmarkReport.throughputTokensPerSecond.value,
        benchmarkReport.driverVersion,
        benchmarkReport.recordedAt
      ]
    );
  }

  public async listProviderInventorySummaries(
    organizationId: OrganizationId
  ): Promise<readonly ProviderInventorySummary[]> {
    return this.listProviderInventorySummariesByOrganizationId(organizationId);
  }

  public async listPlacementProviderInventorySummaries(): Promise<
    readonly ProviderInventorySummary[]
  > {
    return this.listProviderInventorySummariesByOrganizationId(null);
  }

  public async createPlacementDecisionLog(
    log: PlacementDecisionLog
  ): Promise<void> {
    const snapshot = log.toSnapshot();

    await this.pool.query<PlacementDecisionLogRow>(
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
          candidate_count,
          selected_provider_node_id,
          selected_provider_organization_id,
          rejection_reason,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      this.toPlacementDecisionLogParameters(snapshot)
    );
  }

  public async findProviderInventorySummary(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<ProviderInventorySummary | null> {
    const nodeResult = await this.pool.query<ProviderNodeRow>(
      `
        SELECT
          n.id,
          n.organization_id,
          n.machine_id,
          n.label,
          n.runtime,
          n.region,
          n.hostname,
          n.trust_tier,
          n.health_state,
          n.driver_version,
          r.endpoint_url,
          r.price_floor_usd_per_hour,
          r.updated_at AS routing_profile_updated_at,
          n.enrolled_at
        FROM provider_nodes AS n
        LEFT JOIN provider_node_routing_profiles AS r
          ON r.provider_node_id = n.id
        WHERE n.organization_id = $1
          AND n.id = $2
      `,
      [organizationId.value, providerNodeId.value]
    );

    const nodeRow = nodeResult.rows[0];

    if (!nodeRow) {
      return null;
    }

    const gpuResult = await this.pool.query<ProviderNodeGpuRow>(
      `
        SELECT provider_node_id, model, vram_gb, gpu_count, interconnect
        FROM provider_node_gpus
        WHERE provider_node_id = $1
        ORDER BY ordinal ASC
      `,
      [providerNodeId.value]
    );
    const benchmarkResult = await this.pool.query<ProviderNodeBenchmarkRow>(
      `
        SELECT
          b.id,
          b.provider_node_id,
          b.gpu_class,
          b.vram_gb,
          b.throughput_tokens_per_second,
          b.driver_version,
          b.recorded_at
        FROM provider_node_benchmarks AS b
        INNER JOIN provider_nodes AS n ON n.id = b.provider_node_id
        WHERE n.organization_id = $1
          AND b.provider_node_id = $2
        ORDER BY b.recorded_at DESC, b.benchmark_sequence DESC
        LIMIT 1
      `,
      [organizationId.value, providerNodeId.value]
    );

    return this.toProviderInventorySummary(
      nodeRow,
      gpuResult.rows,
      benchmarkResult.rows[0]
    );
  }

  private async upsertFounder(
    client: PoolClient,
    founder: User
  ): Promise<User> {
    const result = await client.query<UserRow>(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE
        SET display_name = EXCLUDED.display_name
        RETURNING id, email, display_name, created_at
      `,
      [
        founder.id.value,
        founder.email.value,
        founder.displayName,
        founder.createdAt
      ]
    );

    return this.toUser(result);
  }

  private toUser(result: QueryResult<UserRow>): User {
    const row = result.rows[0];

    if (!row) {
      throw new Error("Expected a persisted user row.");
    }

    return User.rehydrate({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      createdAt: row.created_at
    });
  }

  private toProviderInventorySummary(
    nodeRow: ProviderNodeRow,
    gpuRows: readonly ProviderNodeGpuRow[],
    latestBenchmark:
      | ProviderNodeBenchmarkRow
      | ProviderBenchmarkReportSnapshot
      | null
      | undefined
  ): ProviderInventorySummary {
    const providerNode = ProviderNode.rehydrate({
      id: nodeRow.id,
      organizationId: nodeRow.organization_id,
      machineId: nodeRow.machine_id,
      label: nodeRow.label,
      runtime: nodeRow.runtime,
      region: nodeRow.region,
      hostname: nodeRow.hostname,
      trustTier: nodeRow.trust_tier,
      healthState: nodeRow.health_state,
      inventory: {
        driverVersion: nodeRow.driver_version,
        gpus: gpuRows.map((gpu) => ({
          model: gpu.model,
          vramGb: gpu.vram_gb,
          count: gpu.gpu_count,
          interconnect: gpu.interconnect
        }))
      },
      routingProfile:
        nodeRow.endpoint_url === null ||
        nodeRow.price_floor_usd_per_hour === null ||
        nodeRow.routing_profile_updated_at === null
          ? null
          : ProviderNodeRoutingProfile.rehydrate({
              providerNodeId: nodeRow.id,
              endpointUrl: nodeRow.endpoint_url,
              priceFloorUsdPerHour: nodeRow.price_floor_usd_per_hour,
              updatedAt: nodeRow.routing_profile_updated_at
            }).toSnapshot(),
      enrolledAt: nodeRow.enrolled_at
    });

    return new ProviderInventorySummary(
      providerNode,
      latestBenchmark === undefined || latestBenchmark === null
        ? null
        : this.toProviderBenchmarkReport(latestBenchmark)
    );
  }

  private toProviderBenchmarkReport(
    row: ProviderNodeBenchmarkRow | ProviderBenchmarkReportSnapshot
  ): ProviderBenchmarkReport {
    if ("provider_node_id" in row) {
      return ProviderBenchmarkReport.rehydrate({
        id: row.id,
        providerNodeId: row.provider_node_id,
        gpuClass: row.gpu_class,
        vramGb: row.vram_gb,
        throughputTokensPerSecond: row.throughput_tokens_per_second,
        driverVersion: row.driver_version,
        recordedAt: row.recorded_at
      });
    }

    return ProviderBenchmarkReport.rehydrate({
      id: row.id,
      providerNodeId: row.providerNodeId,
      gpuClass: row.gpuClass,
      vramGb: row.vramGb,
      throughputTokensPerSecond: row.throughputTokensPerSecond,
      driverVersion: row.driverVersion,
      recordedAt: new Date(row.recordedAt)
    });
  }

  private async listProviderInventorySummariesByOrganizationId(
    organizationId: OrganizationId | null
  ): Promise<readonly ProviderInventorySummary[]> {
    const nodeFilter =
      organizationId === null ? "" : "WHERE n.organization_id = $1";
    const nodeParams = organizationId === null ? [] : [organizationId.value];
    const nodeResult = await this.pool.query<ProviderNodeRow>(
      `
        SELECT
          n.id,
          n.organization_id,
          n.machine_id,
          n.label,
          n.runtime,
          n.region,
          n.hostname,
          n.trust_tier,
          n.health_state,
          n.driver_version,
          r.endpoint_url,
          r.price_floor_usd_per_hour,
          r.updated_at AS routing_profile_updated_at,
          n.enrolled_at
        FROM provider_nodes AS n
        LEFT JOIN provider_node_routing_profiles AS r
          ON r.provider_node_id = n.id
        ${nodeFilter}
        ORDER BY
          n.organization_id ASC,
          n.enrolled_at ASC,
          n.enrollment_sequence ASC
      `,
      nodeParams
    );

    if ((nodeResult.rowCount ?? 0) === 0) {
      return [];
    }

    const inventoryFilter =
      organizationId === null ? "" : "WHERE n.organization_id = $1";
    const benchmarkParams =
      organizationId === null ? [] : [organizationId.value];
    const gpuResult = await this.pool.query<ProviderNodeGpuRow>(
      `
        SELECT g.provider_node_id, g.model, g.vram_gb, g.gpu_count, g.interconnect
        FROM provider_node_gpus AS g
        INNER JOIN provider_nodes AS n ON n.id = g.provider_node_id
        ${inventoryFilter}
        ORDER BY g.provider_node_id ASC, g.ordinal ASC
      `,
      benchmarkParams
    );
    const benchmarkResult = await this.pool.query<ProviderNodeBenchmarkRow>(
      `
        SELECT
          b.id,
          b.provider_node_id,
          b.gpu_class,
          b.vram_gb,
          b.throughput_tokens_per_second,
          b.driver_version,
          b.recorded_at
        FROM provider_node_benchmarks AS b
        INNER JOIN provider_nodes AS n ON n.id = b.provider_node_id
        ${inventoryFilter}
        ORDER BY
          b.provider_node_id ASC,
          b.recorded_at DESC,
          b.benchmark_sequence DESC
      `,
      benchmarkParams
    );

    const gpusByNodeId = new Map<string, ProviderNodeGpuRow[]>();

    for (const row of gpuResult.rows) {
      const rows = gpusByNodeId.get(row.provider_node_id) ?? [];
      rows.push(row);
      gpusByNodeId.set(row.provider_node_id, rows);
    }

    const latestBenchmarkByNodeId = new Map<
      string,
      ProviderBenchmarkReportSnapshot
    >();

    for (const row of benchmarkResult.rows) {
      if (latestBenchmarkByNodeId.has(row.provider_node_id)) {
        continue;
      }

      latestBenchmarkByNodeId.set(row.provider_node_id, {
        id: row.id,
        providerNodeId: row.provider_node_id,
        gpuClass: row.gpu_class,
        vramGb: row.vram_gb,
        throughputTokensPerSecond: row.throughput_tokens_per_second,
        driverVersion: row.driver_version,
        recordedAt: row.recorded_at.toISOString()
      });
    }

    return nodeResult.rows.map((row) =>
      this.toProviderInventorySummary(
        row,
        gpusByNodeId.get(row.id) ?? [],
        latestBenchmarkByNodeId.get(row.id)
      )
    );
  }

  private toPlacementDecisionLogParameters(
    snapshot: PlacementDecisionLogSnapshot
  ): [
    string,
    string,
    string,
    string,
    number,
    string,
    string,
    number,
    number,
    string | null,
    string | null,
    string | null,
    Date
  ] {
    return [
      snapshot.id,
      snapshot.organizationId,
      snapshot.environment,
      snapshot.filters.gpuClass,
      snapshot.filters.minVramGb,
      snapshot.filters.region,
      snapshot.filters.minimumTrustTier,
      snapshot.filters.maxPriceUsdPerHour,
      snapshot.candidateCount,
      snapshot.selectedProviderNodeId,
      snapshot.selectedProviderOrganizationId,
      snapshot.rejectionReason,
      new Date(snapshot.createdAt)
    ];
  }

  private toUtcDateKey(input: Date): string {
    return input.toISOString().slice(0, 10);
  }

  private calculateP95(values: readonly number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const sortedValues = [...values].sort((left, right) => left - right);
    const index = Math.min(
      sortedValues.length - 1,
      Math.ceil(sortedValues.length * 0.95) - 1
    );

    return sortedValues[index] ?? 0;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
