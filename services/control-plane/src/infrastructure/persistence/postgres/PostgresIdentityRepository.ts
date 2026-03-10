import type { Pool, PoolClient, QueryResult } from "pg";
import type { ConsumerDashboardRepository } from "../../../application/dashboard/ports/ConsumerDashboardRepository.js";
import type { ProviderDashboardRepository } from "../../../application/dashboard/ports/ProviderDashboardRepository.js";
import type { ProviderPricingSimulatorRepository } from "../../../application/dashboard/ports/ProviderPricingSimulatorRepository.js";
import type { FraudReviewRepository } from "../../../application/fraud/ports/FraudReviewRepository.js";
import type { GatewayBatchRepository } from "../../../application/batch/ports/GatewayBatchRepository.js";
import type { OrganizationLedgerRepository } from "../../../application/ledger/ports/OrganizationLedgerRepository.js";
import type { ProviderPayoutRepository } from "../../../application/payout/ports/ProviderPayoutRepository.js";
import type { OrganizationApiKeyRepository } from "../../../application/identity/ports/OrganizationApiKeyRepository.js";
import type { OrganizationInvitationRepository } from "../../../application/identity/ports/OrganizationInvitationRepository.js";
import type { OrganizationMembershipRepository } from "../../../application/identity/ports/OrganizationMembershipRepository.js";
import type { OrganizationProvisioningRepository } from "../../../application/identity/ports/OrganizationProvisioningRepository.js";
import type { PlacementCandidateRepository } from "../../../application/placement/ports/PlacementCandidateRepository.js";
import type { SyncPlacementRepository } from "../../../application/placement/ports/SyncPlacementRepository.js";
import type { ProviderBenchmarkRepository } from "../../../application/provider/ports/ProviderBenchmarkRepository.js";
import type { ProviderInventoryRepository } from "../../../application/provider/ports/ProviderInventoryRepository.js";
import type { ProviderNodeAttestationRepository } from "../../../application/provider/ports/ProviderNodeAttestationRepository.js";
import type { ProviderNodeEnrollmentRepository } from "../../../application/provider/ports/ProviderNodeEnrollmentRepository.js";
import type { ProviderRoutingProfileRepository } from "../../../application/provider/ports/ProviderRoutingProfileRepository.js";
import type { ProviderRoutingStateRepository } from "../../../application/provider/ports/ProviderRoutingStateRepository.js";
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
import { FraudGraphCounterpartyExposure } from "../../../domain/fraud/FraudGraphCounterpartyExposure.js";
import type { LedgerTransaction } from "../../../domain/ledger/LedgerTransaction.js";
import { OrganizationWalletSummary } from "../../../domain/ledger/OrganizationWalletSummary.js";
import { StagedPayoutExport } from "../../../domain/ledger/StagedPayoutExport.js";
import { StagedPayoutExportEntry } from "../../../domain/ledger/StagedPayoutExportEntry.js";
import { UsdAmount } from "../../../domain/ledger/UsdAmount.js";
import type { GatewayUsageMeterEvent } from "../../../domain/metering/GatewayUsageMeterEvent.js";
import { GatewayBatchJob } from "../../../domain/batch/GatewayBatchJob.js";
import { GatewayBatchJobItem } from "../../../domain/batch/GatewayBatchJobItem.js";
import { GatewayFile } from "../../../domain/batch/GatewayFile.js";
import { ProviderPayoutAccount } from "../../../domain/payout/ProviderPayoutAccount.js";
import { ProviderPayoutAvailability } from "../../../domain/payout/ProviderPayoutAvailability.js";
import { ProviderPayoutDisbursement } from "../../../domain/payout/ProviderPayoutDisbursement.js";
import type { ProviderPayoutRun } from "../../../domain/payout/ProviderPayoutRun.js";
import type {
  PlacementDecisionLog,
  PlacementDecisionLogSnapshot
} from "../../../domain/placement/PlacementDecisionLog.js";
import {
  ProviderBenchmarkReport,
  type ProviderBenchmarkReportSnapshot
} from "../../../domain/provider/ProviderBenchmarkReport.js";
import { ProviderInventorySummary } from "../../../domain/provider/ProviderInventorySummary.js";
import type { ProviderNodeAttestationSnapshot } from "../../../domain/provider/ProviderNodeAttestation.js";
import { ProviderNodeAttestationChallenge } from "../../../domain/provider/ProviderNodeAttestationChallenge.js";
import type { ProviderNodeAttestationRecord } from "../../../domain/provider/ProviderNodeAttestationRecord.js";
import type { ProviderMachineId } from "../../../domain/provider/ProviderMachineId.js";
import type { ProviderNodeId } from "../../../domain/provider/ProviderNodeId.js";
import { ProviderNode } from "../../../domain/provider/ProviderNode.js";
import { ProviderNodeRoutingProfile } from "../../../domain/provider/ProviderNodeRoutingProfile.js";
import type { ProviderWarmModelState } from "../../../domain/provider/ProviderWarmModelState.js";
import { resolveEffectiveProviderTrustTier } from "../../../domain/provider/resolveEffectiveProviderTrustTier.js";

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

interface ProviderNodeAttestationChallengeRow {
  id: string;
  provider_node_id: string;
  nonce: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

interface ProviderNodeAttestationRow {
  id: string;
  provider_node_id: string;
  challenge_id: string;
  attestation_type: string;
  attestation_public_key_fingerprint: string;
  quoted_at: Date;
  secure_boot_enabled: boolean;
  pcr_values: Record<string, string>;
  verified: boolean;
  failure_reason: string | null;
  recorded_at: Date;
  expires_at: Date | null;
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

interface ProviderNodeWarmModelStateRow {
  provider_node_id: string;
  approved_model_alias: string;
  declared_at: Date;
  expires_at: Date;
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
  approved_model_alias: string | null;
  candidate_count: number;
  selected_provider_node_id: string | null;
  selected_provider_organization_id: string | null;
  selection_score: number | null;
  price_performance_score: number | null;
  warm_cache_matched: boolean | null;
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

interface ProviderSettlementEconomicsRow {
  settlement_count: string;
  provider_payable_cents: string;
  platform_revenue_cents: string;
  reserve_holdback_cents: string;
}

interface GatewayUsageMeterEventRow {
  occurred_at: Date;
  approved_model_alias: string;
  total_tokens: number;
  latency_ms: number;
}

interface ProviderNodeUsageTotalRow {
  provider_node_id: string | null;
  total_tokens: string;
}

interface CounterpartySettlementAggregateRow {
  counterparty_organization_id: string;
  counterparty_name: string;
  counterparty_slug: string;
  settlement_count: string;
  settled_cents: string;
  first_activity_at: Date;
  last_activity_at: Date;
}

interface CounterpartyUsageAggregateRow {
  counterparty_organization_id: string;
  counterparty_name: string;
  counterparty_slug: string;
  usage_event_count: string;
  usage_total_tokens: string;
  first_activity_at: Date;
  last_activity_at: Date;
}

interface SharedMemberAggregateRow {
  counterparty_organization_id: string;
  counterparty_name: string;
  counterparty_slug: string;
  shared_member_email: string;
}

interface GatewayFileRow {
  id: string;
  organization_id: string;
  environment: string;
  purpose: "batch";
  filename: string;
  media_type: string;
  bytes: number;
  content: string;
  created_by_user_id: string;
  created_at: Date;
}

interface GatewayBatchJobRow {
  id: string;
  organization_id: string;
  environment: string;
  input_file_id: string;
  output_file_id: string | null;
  error_file_id: string | null;
  endpoint: "/v1/chat/completions" | "/v1/embeddings";
  completion_window: "24h";
  status:
    | "validating"
    | "in_progress"
    | "finalizing"
    | "completed"
    | "failed"
    | "cancelling"
    | "cancelled";
  created_by_user_id: string;
  created_at: Date;
  in_progress_at: Date | null;
  completed_at: Date | null;
  request_count_total: number;
  request_count_completed: number;
  request_count_failed: number;
}

interface GatewayBatchItemRow {
  batch_id: string;
  ordinal: number;
  custom_id: string;
  method: "POST";
  endpoint: "/v1/chat/completions" | "/v1/embeddings";
  body: Record<string, unknown>;
  status: "pending" | "completed" | "failed" | "cancelled";
  response_body: Record<string, unknown> | null;
  error_body: Record<string, unknown> | null;
  completed_at: Date | null;
}

interface ProviderOrganizationRow {
  id: string;
}

interface ProviderPayoutAccountRow {
  organization_id: string;
  stripe_account_id: string;
  onboarding_status: "pending" | "completed";
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  country: string;
  default_currency: string;
  requirements_currently_due: string[];
  requirements_eventually_due: string[];
  last_stripe_sync_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface ProviderPayoutDisbursementRow {
  id: string;
  payout_run_id: string;
  provider_organization_id: string;
  stripe_account_id: string;
  stripe_transfer_id: string | null;
  stripe_payout_id: string | null;
  idempotency_key: string;
  amount_cents: string;
  currency: string;
  status: "pending" | "paid" | "failed" | "canceled";
  failure_code: string | null;
  failure_message: string | null;
  created_at: Date;
  updated_at: Date;
  paid_at: Date | null;
  failed_at: Date | null;
  canceled_at: Date | null;
}

export class PostgresIdentityRepository
  implements
    ConsumerDashboardRepository,
    ProviderDashboardRepository,
    ProviderPricingSimulatorRepository,
    FraudReviewRepository,
    GatewayBatchRepository,
    GatewayUsageMeterEventRepository,
    OrganizationLedgerRepository,
    ProviderPayoutRepository,
    OrganizationProvisioningRepository,
    OrganizationInvitationRepository,
    OrganizationMembershipRepository,
    OrganizationApiKeyRepository,
    PlacementCandidateRepository,
    SyncPlacementRepository,
    ProviderNodeEnrollmentRepository,
    ProviderBenchmarkRepository,
    ProviderInventoryRepository,
    ProviderNodeAttestationRepository,
    ProviderRoutingProfileRepository,
    ProviderRoutingStateRepository
{
  public constructor(
    private readonly pool: Pick<Pool, "connect" | "query">,
    private readonly clock: () => Date = () => new Date()
  ) {}

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

  public async listProviderOrganizationIds(input: {
    providerOrganizationId?: OrganizationId;
  }): Promise<readonly string[]> {
    const result = await this.pool.query<ProviderOrganizationRow>(
      `
        SELECT id
        FROM organizations
        WHERE account_capabilities @> ARRAY['provider']::text[]
          AND ($1::uuid IS NULL OR id = $1)
        ORDER BY id ASC
      `,
      [input.providerOrganizationId?.value ?? null]
    );

    return result.rows.map((row) => row.id);
  }

  public async findProviderPayoutAccountByOrganizationId(
    organizationId: OrganizationId
  ): Promise<ProviderPayoutAccount | null> {
    const result = await this.pool.query<ProviderPayoutAccountRow>(
      `
        SELECT
          organization_id,
          stripe_account_id,
          onboarding_status,
          charges_enabled,
          payouts_enabled,
          details_submitted,
          country,
          default_currency,
          requirements_currently_due,
          requirements_eventually_due,
          last_stripe_sync_at,
          created_at,
          updated_at
        FROM provider_payout_accounts
        WHERE organization_id = $1
      `,
      [organizationId.value]
    );

    return this.mapProviderPayoutAccountRow(result.rows[0]);
  }

  public async findProviderPayoutAccountByStripeAccountId(
    stripeAccountId: string
  ): Promise<ProviderPayoutAccount | null> {
    const result = await this.pool.query<ProviderPayoutAccountRow>(
      `
        SELECT
          organization_id,
          stripe_account_id,
          onboarding_status,
          charges_enabled,
          payouts_enabled,
          details_submitted,
          country,
          default_currency,
          requirements_currently_due,
          requirements_eventually_due,
          last_stripe_sync_at,
          created_at,
          updated_at
        FROM provider_payout_accounts
        WHERE stripe_account_id = $1
      `,
      [stripeAccountId]
    );

    return this.mapProviderPayoutAccountRow(result.rows[0]);
  }

  public async upsertProviderPayoutAccount(
    account: ProviderPayoutAccount
  ): Promise<void> {
    const snapshot = account.toSnapshot();

    await this.pool.query(
      `
        INSERT INTO provider_payout_accounts (
          organization_id,
          stripe_account_id,
          onboarding_status,
          charges_enabled,
          payouts_enabled,
          details_submitted,
          country,
          default_currency,
          requirements_currently_due,
          requirements_eventually_due,
          last_stripe_sync_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13)
        ON CONFLICT (organization_id)
        DO UPDATE SET
          stripe_account_id = EXCLUDED.stripe_account_id,
          onboarding_status = EXCLUDED.onboarding_status,
          charges_enabled = EXCLUDED.charges_enabled,
          payouts_enabled = EXCLUDED.payouts_enabled,
          details_submitted = EXCLUDED.details_submitted,
          country = EXCLUDED.country,
          default_currency = EXCLUDED.default_currency,
          requirements_currently_due = EXCLUDED.requirements_currently_due,
          requirements_eventually_due = EXCLUDED.requirements_eventually_due,
          last_stripe_sync_at = EXCLUDED.last_stripe_sync_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        snapshot.organizationId,
        snapshot.stripeAccountId,
        snapshot.onboardingStatus,
        snapshot.chargesEnabled,
        snapshot.payoutsEnabled,
        snapshot.detailsSubmitted,
        snapshot.country,
        snapshot.defaultCurrency,
        JSON.stringify(snapshot.requirementsCurrentlyDue),
        JSON.stringify(snapshot.requirementsEventuallyDue),
        snapshot.lastStripeSyncAt,
        snapshot.createdAt,
        snapshot.updatedAt
      ]
    );
  }

  public async getProviderPayoutAvailability(
    organizationId: OrganizationId
  ): Promise<ProviderPayoutAvailability> {
    const wallet = await this.getOrganizationWalletSummary(organizationId);
    const reservedResult = await this.pool.query<{
      reserved_cents: string;
      last_payout_at: Date | null;
      last_payout_status: "pending" | "paid" | "failed" | "canceled" | null;
    }>(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN status IN ('pending', 'paid') THEN amount_cents
                ELSE 0
              END
            ),
            0
          )::text AS reserved_cents,
          (
            ARRAY_AGG(updated_at ORDER BY updated_at DESC)
          )[1] AS last_payout_at,
          (
            ARRAY_AGG(status ORDER BY updated_at DESC)
          )[1] AS last_payout_status
        FROM provider_payout_disbursements
        WHERE provider_organization_id = $1
      `,
      [organizationId.value]
    );
    const reservedCents = Number.parseInt(
      reservedResult.rows[0]?.reserved_cents ?? "0",
      10
    );
    const eligiblePayoutCents = Math.max(
      wallet.withdrawableCash.cents - reservedCents,
      0
    );

    return ProviderPayoutAvailability.create({
      organizationId: organizationId.value,
      pendingEarningsCents: wallet.pendingEarnings.cents,
      reserveHoldbackCents: Math.max(
        wallet.pendingEarnings.cents - wallet.withdrawableCash.cents,
        0
      ),
      withdrawableCashCents: wallet.withdrawableCash.cents,
      eligiblePayoutCents,
      lastPayoutAt: reservedResult.rows[0]?.last_payout_at ?? null,
      lastPayoutStatus: reservedResult.rows[0]?.last_payout_status ?? "none"
    });
  }

  public async createProviderPayoutRun(run: ProviderPayoutRun): Promise<void> {
    const snapshot = run.toSnapshot();

    await this.pool.query(
      `
        INSERT INTO provider_payout_runs (
          id,
          environment,
          provider_organization_id_filter,
          dry_run,
          status,
          started_at,
          completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        snapshot.id,
        snapshot.environment,
        snapshot.providerOrganizationIdFilter,
        snapshot.dryRun,
        snapshot.status,
        snapshot.startedAt,
        snapshot.completedAt
      ]
    );
  }

  public async updateProviderPayoutRun(run: ProviderPayoutRun): Promise<void> {
    const snapshot = run.toSnapshot();

    await this.pool.query(
      `
        UPDATE provider_payout_runs
        SET status = $2, completed_at = $3
        WHERE id = $1
      `,
      [snapshot.id, snapshot.status, snapshot.completedAt]
    );
  }

  public async createProviderPayoutDisbursement(
    disbursement: ProviderPayoutDisbursement
  ): Promise<void> {
    const snapshot = disbursement.toSnapshot();

    await this.pool.query(
      `
        INSERT INTO provider_payout_disbursements (
          id,
          payout_run_id,
          provider_organization_id,
          stripe_account_id,
          stripe_transfer_id,
          stripe_payout_id,
          idempotency_key,
          amount_cents,
          currency,
          status,
          failure_code,
          failure_message,
          created_at,
          updated_at,
          paid_at,
          failed_at,
          canceled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
      [
        snapshot.id,
        snapshot.payoutRunId,
        snapshot.providerOrganizationId,
        snapshot.stripeAccountId,
        snapshot.stripeTransferId,
        snapshot.stripePayoutId,
        snapshot.idempotencyKey,
        disbursement.amount.cents,
        snapshot.currency,
        snapshot.status,
        snapshot.failureCode,
        snapshot.failureMessage,
        snapshot.createdAt,
        snapshot.updatedAt,
        snapshot.paidAt,
        snapshot.failedAt,
        snapshot.canceledAt
      ]
    );
  }

  public async updateProviderPayoutDisbursement(
    disbursement: ProviderPayoutDisbursement
  ): Promise<void> {
    const snapshot = disbursement.toSnapshot();

    await this.pool.query(
      `
        UPDATE provider_payout_disbursements
        SET
          stripe_transfer_id = $2,
          stripe_payout_id = $3,
          status = $4,
          failure_code = $5,
          failure_message = $6,
          updated_at = $7,
          paid_at = $8,
          failed_at = $9,
          canceled_at = $10
        WHERE id = $1
      `,
      [
        snapshot.id,
        snapshot.stripeTransferId,
        snapshot.stripePayoutId,
        snapshot.status,
        snapshot.failureCode,
        snapshot.failureMessage,
        snapshot.updatedAt,
        snapshot.paidAt,
        snapshot.failedAt,
        snapshot.canceledAt
      ]
    );
  }

  public async findProviderPayoutDisbursementByStripePayoutId(
    stripePayoutId: string
  ): Promise<ProviderPayoutDisbursement | null> {
    const result = await this.pool.query<ProviderPayoutDisbursementRow>(
      `
        SELECT
          id,
          payout_run_id,
          provider_organization_id,
          stripe_account_id,
          stripe_transfer_id,
          stripe_payout_id,
          idempotency_key,
          amount_cents::text AS amount_cents,
          currency,
          status,
          failure_code,
          failure_message,
          created_at,
          updated_at,
          paid_at,
          failed_at,
          canceled_at
        FROM provider_payout_disbursements
        WHERE stripe_payout_id = $1
      `,
      [stripePayoutId]
    );

    return this.mapProviderPayoutDisbursementRow(result.rows[0]);
  }

  public async recordStripeWebhookReceipt(input: {
    eventId: string;
    eventType: string;
    receivedAt: Date;
    payload: Record<string, unknown>;
  }): Promise<boolean> {
    const result = await this.pool.query(
      `
        INSERT INTO stripe_webhook_receipts (
          event_id,
          event_type,
          received_at,
          payload
        )
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        input.eventId,
        input.eventType,
        input.receivedAt.toISOString(),
        JSON.stringify(input.payload)
      ]
    );

    return (result.rowCount ?? 0) > 0;
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        snapshot.workloadBundleId,
        snapshot.occurredAt,
        snapshot.customerOrganizationId,
        snapshot.providerOrganizationId,
        snapshot.providerNodeId,
        snapshot.environment,
        snapshot.requestKind,
        snapshot.approvedModelAlias,
        snapshot.manifestId,
        snapshot.decisionLogId,
        snapshot.batchId,
        snapshot.batchItemId,
        snapshot.promptTokens,
        snapshot.completionTokens,
        snapshot.totalTokens,
        snapshot.latencyMs
      ]
    );
  }

  public async createGatewayFile(file: GatewayFile): Promise<void> {
    const snapshot = file.toSnapshot();

    await this.pool.query(
      `
        INSERT INTO gateway_files (
          id,
          organization_id,
          environment,
          purpose,
          filename,
          media_type,
          bytes,
          content,
          created_by_user_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        snapshot.id,
        snapshot.organizationId,
        snapshot.environment,
        snapshot.purpose,
        snapshot.filename,
        snapshot.mediaType,
        snapshot.bytes,
        file.content,
        snapshot.createdByUserId,
        snapshot.createdAt
      ]
    );
  }

  public async findGatewayFileById(
    fileId: string
  ): Promise<GatewayFile | null> {
    const result = await this.pool.query<GatewayFileRow>(
      `
        SELECT
          id,
          organization_id,
          environment,
          purpose,
          filename,
          media_type,
          bytes,
          content,
          created_by_user_id,
          created_at
        FROM gateway_files
        WHERE id = $1
      `,
      [fileId]
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return GatewayFile.rehydrate({
      id: row.id,
      organizationId: row.organization_id,
      environment: row.environment,
      purpose: row.purpose,
      filename: row.filename,
      mediaType: row.media_type,
      bytes: row.bytes,
      content: row.content,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at
    });
  }

  public async createGatewayBatchJob(
    batch: GatewayBatchJob,
    items: readonly GatewayBatchJobItem[]
  ): Promise<void> {
    const client = await this.pool.connect();
    const snapshot = batch.toSnapshot();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          INSERT INTO gateway_batch_jobs (
            id,
            organization_id,
            environment,
            input_file_id,
            output_file_id,
            error_file_id,
            endpoint,
            completion_window,
            status,
            created_by_user_id,
            created_at,
            in_progress_at,
            completed_at,
            request_count_total,
            request_count_completed,
            request_count_failed
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
        [
          snapshot.id,
          snapshot.organizationId,
          snapshot.environment,
          snapshot.inputFileId,
          snapshot.outputFileId,
          snapshot.errorFileId,
          snapshot.endpoint,
          snapshot.completionWindow,
          snapshot.status,
          snapshot.createdByUserId,
          snapshot.createdAt,
          snapshot.inProgressAt,
          snapshot.completedAt,
          snapshot.requestCounts.total,
          snapshot.requestCounts.completed,
          snapshot.requestCounts.failed
        ]
      );

      for (const item of items) {
        const itemSnapshot = item.toSnapshot();
        await client.query(
          `
            INSERT INTO gateway_batch_items (
              batch_id,
              ordinal,
              custom_id,
              method,
              endpoint,
              body,
              status,
              response_body,
              error_body,
              completed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10)
          `,
          [
            itemSnapshot.batchId,
            itemSnapshot.ordinal,
            itemSnapshot.customId,
            itemSnapshot.method,
            itemSnapshot.endpoint,
            JSON.stringify(itemSnapshot.body),
            itemSnapshot.status,
            itemSnapshot.responseBody === null
              ? null
              : JSON.stringify(itemSnapshot.responseBody),
            itemSnapshot.errorBody === null
              ? null
              : JSON.stringify(itemSnapshot.errorBody),
            itemSnapshot.completedAt
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

  public async findGatewayBatchJobById(
    batchId: string
  ): Promise<GatewayBatchJob | null> {
    const result = await this.pool.query<GatewayBatchJobRow>(
      `
        SELECT
          id,
          organization_id,
          environment,
          input_file_id,
          output_file_id,
          error_file_id,
          endpoint,
          completion_window,
          status,
          created_by_user_id,
          created_at,
          in_progress_at,
          completed_at,
          request_count_total,
          request_count_completed,
          request_count_failed
        FROM gateway_batch_jobs
        WHERE id = $1
      `,
      [batchId]
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return GatewayBatchJob.rehydrate({
      id: row.id,
      organizationId: row.organization_id,
      environment: row.environment,
      inputFileId: row.input_file_id,
      outputFileId: row.output_file_id,
      errorFileId: row.error_file_id,
      endpoint: row.endpoint,
      completionWindow: row.completion_window,
      status: row.status,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      inProgressAt: row.in_progress_at,
      completedAt: row.completed_at,
      requestCounts: {
        total: row.request_count_total,
        completed: row.request_count_completed,
        failed: row.request_count_failed
      }
    });
  }

  public async listGatewayBatchItems(
    batchId: string
  ): Promise<readonly GatewayBatchJobItem[]> {
    const result = await this.pool.query<GatewayBatchItemRow>(
      `
        SELECT
          batch_id,
          ordinal,
          custom_id,
          method,
          endpoint,
          body,
          status,
          response_body,
          error_body,
          completed_at
        FROM gateway_batch_items
        WHERE batch_id = $1
        ORDER BY ordinal ASC
      `,
      [batchId]
    );

    return result.rows.map((row) =>
      GatewayBatchJobItem.rehydrate({
        batchId: row.batch_id,
        ordinal: row.ordinal,
        customId: row.custom_id,
        method: row.method,
        endpoint: row.endpoint,
        body: row.body,
        status: row.status,
        responseBody: row.response_body,
        errorBody: row.error_body,
        completedAt: row.completed_at
      })
    );
  }

  public async updateGatewayBatchStatus(input: {
    batchId: string;
    status:
      | "validating"
      | "in_progress"
      | "finalizing"
      | "completed"
      | "failed"
      | "cancelling"
      | "cancelled";
    inProgressAt?: string | null;
    completedAt?: string | null;
    outputFileId?: string | null;
    errorFileId?: string | null;
  }): Promise<void> {
    await this.pool.query(
      `
        UPDATE gateway_batch_jobs
        SET
          status = $2,
          in_progress_at = COALESCE($3, in_progress_at),
          completed_at = COALESCE($4, completed_at),
          output_file_id = COALESCE($5, output_file_id),
          error_file_id = COALESCE($6, error_file_id)
        WHERE id = $1
      `,
      [
        input.batchId,
        input.status,
        input.inProgressAt ?? null,
        input.completedAt ?? null,
        input.outputFileId ?? null,
        input.errorFileId ?? null
      ]
    );
  }

  public async markGatewayBatchItemCompleted(input: {
    batchId: string;
    ordinal: number;
    responseBody: Record<string, unknown>;
    completedAt: string;
  }): Promise<void> {
    await this.pool.query(
      `
        UPDATE gateway_batch_items
        SET
          status = 'completed',
          response_body = $3::jsonb,
          completed_at = $4
        WHERE batch_id = $1 AND ordinal = $2
      `,
      [
        input.batchId,
        input.ordinal,
        JSON.stringify(input.responseBody),
        input.completedAt
      ]
    );
    await this.pool.query(
      `
        UPDATE gateway_batch_jobs
        SET request_count_completed = request_count_completed + 1
        WHERE id = $1
      `,
      [input.batchId]
    );
  }

  public async markGatewayBatchItemFailed(input: {
    batchId: string;
    ordinal: number;
    errorBody: Record<string, unknown>;
    completedAt: string;
  }): Promise<void> {
    await this.pool.query(
      `
        UPDATE gateway_batch_items
        SET
          status = 'failed',
          error_body = $3::jsonb,
          completed_at = $4
        WHERE batch_id = $1 AND ordinal = $2
      `,
      [
        input.batchId,
        input.ordinal,
        JSON.stringify(input.errorBody),
        input.completedAt
      ]
    );
    await this.pool.query(
      `
        UPDATE gateway_batch_jobs
        SET request_count_failed = request_count_failed + 1
        WHERE id = $1
      `,
      [input.batchId]
    );
  }

  public async markGatewayBatchItemCancelled(input: {
    batchId: string;
    ordinal: number;
    completedAt: string;
  }): Promise<void> {
    await this.pool.query(
      `
        UPDATE gateway_batch_items
        SET
          status = 'cancelled',
          completed_at = $3
        WHERE batch_id = $1 AND ordinal = $2
      `,
      [input.batchId, input.ordinal, input.completedAt]
    );
  }

  public async claimNextGatewayBatch(): Promise<GatewayBatchJob | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query<GatewayBatchJobRow>(
        `
          SELECT
            id,
            organization_id,
            environment,
            input_file_id,
            output_file_id,
            error_file_id,
            endpoint,
            completion_window,
            status,
            created_by_user_id,
            created_at,
            in_progress_at,
            completed_at,
            request_count_total,
            request_count_completed,
            request_count_failed
          FROM gateway_batch_jobs
          WHERE status = 'validating'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `
      );
      const row = result.rows[0];

      if (row === undefined) {
        await client.query("COMMIT");
        return null;
      }

      const inProgressAt = this.clock().toISOString();
      await client.query(
        `
          UPDATE gateway_batch_jobs
          SET status = 'in_progress', in_progress_at = $2
          WHERE id = $1
        `,
        [row.id, inProgressAt]
      );
      await client.query("COMMIT");

      return GatewayBatchJob.rehydrate({
        id: row.id,
        organizationId: row.organization_id,
        environment: row.environment,
        inputFileId: row.input_file_id,
        outputFileId: row.output_file_id,
        errorFileId: row.error_file_id,
        endpoint: row.endpoint,
        completionWindow: row.completion_window,
        status: "in_progress",
        createdByUserId: row.created_by_user_id,
        createdAt: row.created_at,
        inProgressAt: new Date(inProgressAt),
        completedAt: row.completed_at,
        requestCounts: {
          total: row.request_count_total,
          completed: row.request_count_completed,
          failed: row.request_count_failed
        }
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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

  public async listProviderNodeUsageTotals(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      providerNodeId: string;
      totalTokens: number;
    }[]
  > {
    const result = await this.pool.query<ProviderNodeUsageTotalRow>(
      `
        SELECT
          provider_node_id,
          COALESCE(SUM(total_tokens), 0)::text AS total_tokens
        FROM gateway_usage_meter_events
        WHERE provider_organization_id = $1
          AND occurred_at >= $2
          AND occurred_at < $3
        GROUP BY provider_node_id
        ORDER BY provider_node_id ASC
      `,
      [
        input.organizationId.value,
        input.startDateInclusive.toISOString(),
        input.endDateExclusive.toISOString()
      ]
    );

    return result.rows
      .filter(
        (row): row is ProviderNodeUsageTotalRow & { provider_node_id: string } =>
          row.provider_node_id !== null
      )
      .map((row) => ({
        providerNodeId: row.provider_node_id,
        totalTokens: Number.parseInt(row.total_tokens, 10)
      }));
  }

  public async getProviderSettlementEconomics(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<{
    settlementCount: number;
    providerPayable: UsdAmount;
    platformRevenue: UsdAmount;
    reserveHoldback: UsdAmount;
  }> {
    const result = await this.pool.query<ProviderSettlementEconomicsRow>(
      `
        SELECT
          COUNT(*)::text AS settlement_count,
          COALESCE(SUM(provider_posting.amount_cents), 0)::text AS provider_payable_cents,
          COALESCE(SUM(platform_posting.amount_cents), 0)::text AS platform_revenue_cents,
          COALESCE(SUM(reserve_posting.amount_cents), 0)::text AS reserve_holdback_cents
        FROM ledger_transactions
        INNER JOIN ledger_postings AS provider_posting
          ON provider_posting.transaction_id = ledger_transactions.id
         AND provider_posting.account_code = 'provider_payable'
         AND provider_posting.direction = 'credit'
         AND provider_posting.organization_id = $1
        LEFT JOIN ledger_postings AS platform_posting
          ON platform_posting.transaction_id = ledger_transactions.id
         AND platform_posting.account_code = 'platform_revenue'
         AND platform_posting.direction = 'credit'
        LEFT JOIN ledger_postings AS reserve_posting
          ON reserve_posting.transaction_id = ledger_transactions.id
         AND reserve_posting.account_code = 'risk_reserve'
         AND reserve_posting.direction = 'credit'
         AND reserve_posting.organization_id = $1
        WHERE ledger_transactions.transaction_type = 'job_settlement'
          AND ledger_transactions.occurred_at >= $2
          AND ledger_transactions.occurred_at < $3
      `,
      [
        input.organizationId.value,
        input.startDateInclusive.toISOString(),
        input.endDateExclusive.toISOString()
      ]
    );
    const row = result.rows[0];

    return {
      settlementCount:
        row === undefined ? 0 : Number.parseInt(row.settlement_count, 10),
      providerPayable: UsdAmount.createFromCents(
        row === undefined ? 0 : Number.parseInt(row.provider_payable_cents, 10)
      ),
      platformRevenue: UsdAmount.createFromCents(
        row === undefined
          ? 0
          : Number.parseInt(row.platform_revenue_cents, 10)
      ),
      reserveHoldback: UsdAmount.createFromCents(
        row === undefined
          ? 0
          : Number.parseInt(row.reserve_holdback_cents, 10)
      )
    };
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

  public async listFraudGraphCounterpartyExposures(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<readonly FraudGraphCounterpartyExposure[]> {
    const organizationId = input.organizationId.value;
    const startDateInclusive = input.startDateInclusive.toISOString();
    const endDateExclusive = input.endDateExclusive.toISOString();
    const exposures = new Map<
      string,
      {
        counterpartyOrganizationId: string;
        counterpartyOrganizationName: string;
        counterpartyOrganizationSlug: string;
        sharedMemberEmails: string[];
        outgoingSettlementCount: number;
        outgoingSettledCents: number;
        outgoingUsageEventCount: number;
        outgoingUsageTotalTokens: number;
        incomingSettlementCount: number;
        incomingSettledCents: number;
        incomingUsageEventCount: number;
        incomingUsageTotalTokens: number;
        firstActivityAt: Date | null;
        lastActivityAt: Date | null;
      }
    >();

    const ensureExposure = (row: {
      counterpartyOrganizationId: string;
      counterpartyOrganizationName: string;
      counterpartyOrganizationSlug: string;
    }) => {
      const existing = exposures.get(row.counterpartyOrganizationId);

      if (existing !== undefined) {
        return existing;
      }

      const created = {
        counterpartyOrganizationId: row.counterpartyOrganizationId,
        counterpartyOrganizationName: row.counterpartyOrganizationName,
        counterpartyOrganizationSlug: row.counterpartyOrganizationSlug,
        sharedMemberEmails: [] as string[],
        outgoingSettlementCount: 0,
        outgoingSettledCents: 0,
        outgoingUsageEventCount: 0,
        outgoingUsageTotalTokens: 0,
        incomingSettlementCount: 0,
        incomingSettledCents: 0,
        incomingUsageEventCount: 0,
        incomingUsageTotalTokens: 0,
        firstActivityAt: null as Date | null,
        lastActivityAt: null as Date | null
      };

      exposures.set(row.counterpartyOrganizationId, created);
      return created;
    };

    const mergeActivityWindow = (
      current: {
        firstActivityAt: Date | null;
        lastActivityAt: Date | null;
      },
      firstActivityAt: Date,
      lastActivityAt: Date
    ) => {
      current.firstActivityAt =
        current.firstActivityAt === null || current.firstActivityAt > firstActivityAt
          ? firstActivityAt
          : current.firstActivityAt;
      current.lastActivityAt =
        current.lastActivityAt === null || current.lastActivityAt < lastActivityAt
          ? lastActivityAt
          : current.lastActivityAt;
    };

    const outgoingSettlements =
      await this.pool.query<CounterpartySettlementAggregateRow>(
        `
          SELECT
            provider_posting.organization_id AS counterparty_organization_id,
            counterparty.name AS counterparty_name,
            counterparty.slug AS counterparty_slug,
            COUNT(*)::text AS settlement_count,
            COALESCE(SUM(provider_posting.amount_cents), 0)::text AS settled_cents,
            MIN(ledger_transactions.occurred_at) AS first_activity_at,
            MAX(ledger_transactions.occurred_at) AS last_activity_at
          FROM ledger_transactions
          INNER JOIN ledger_postings AS provider_posting
            ON provider_posting.transaction_id = ledger_transactions.id
           AND provider_posting.account_code = 'provider_payable'
           AND provider_posting.direction = 'credit'
          INNER JOIN organizations AS counterparty
            ON counterparty.id = provider_posting.organization_id
          WHERE ledger_transactions.organization_id = $1
            AND ledger_transactions.transaction_type = 'job_settlement'
            AND ledger_transactions.occurred_at >= $2
            AND ledger_transactions.occurred_at < $3
          GROUP BY
            provider_posting.organization_id,
            counterparty.name,
            counterparty.slug
          ORDER BY provider_posting.organization_id ASC
        `,
        [organizationId, startDateInclusive, endDateExclusive]
      );

    for (const row of outgoingSettlements.rows) {
      const current = ensureExposure({
        counterpartyOrganizationId: row.counterparty_organization_id,
        counterpartyOrganizationName: row.counterparty_name,
        counterpartyOrganizationSlug: row.counterparty_slug
      });
      current.outgoingSettlementCount = Number.parseInt(row.settlement_count, 10);
      current.outgoingSettledCents = Number.parseInt(row.settled_cents, 10);
      mergeActivityWindow(current, row.first_activity_at, row.last_activity_at);
    }

    const incomingSettlements =
      await this.pool.query<CounterpartySettlementAggregateRow>(
        `
          SELECT
            ledger_transactions.organization_id AS counterparty_organization_id,
            counterparty.name AS counterparty_name,
            counterparty.slug AS counterparty_slug,
            COUNT(*)::text AS settlement_count,
            COALESCE(SUM(provider_posting.amount_cents), 0)::text AS settled_cents,
            MIN(ledger_transactions.occurred_at) AS first_activity_at,
            MAX(ledger_transactions.occurred_at) AS last_activity_at
          FROM ledger_transactions
          INNER JOIN ledger_postings AS provider_posting
            ON provider_posting.transaction_id = ledger_transactions.id
           AND provider_posting.account_code = 'provider_payable'
           AND provider_posting.direction = 'credit'
           AND provider_posting.organization_id = $1
          INNER JOIN organizations AS counterparty
            ON counterparty.id = ledger_transactions.organization_id
          WHERE ledger_transactions.transaction_type = 'job_settlement'
            AND ledger_transactions.occurred_at >= $2
            AND ledger_transactions.occurred_at < $3
          GROUP BY
            ledger_transactions.organization_id,
            counterparty.name,
            counterparty.slug
          ORDER BY ledger_transactions.organization_id ASC
        `,
        [organizationId, startDateInclusive, endDateExclusive]
      );

    for (const row of incomingSettlements.rows) {
      const current = ensureExposure({
        counterpartyOrganizationId: row.counterparty_organization_id,
        counterpartyOrganizationName: row.counterparty_name,
        counterpartyOrganizationSlug: row.counterparty_slug
      });
      current.incomingSettlementCount = Number.parseInt(row.settlement_count, 10);
      current.incomingSettledCents = Number.parseInt(row.settled_cents, 10);
      mergeActivityWindow(current, row.first_activity_at, row.last_activity_at);
    }

    const outgoingUsage = await this.pool.query<CounterpartyUsageAggregateRow>(
      `
        SELECT
          gateway_usage_meter_events.provider_organization_id AS counterparty_organization_id,
          counterparty.name AS counterparty_name,
          counterparty.slug AS counterparty_slug,
          COUNT(*)::text AS usage_event_count,
          COALESCE(SUM(gateway_usage_meter_events.total_tokens), 0)::text AS usage_total_tokens,
          MIN(gateway_usage_meter_events.occurred_at) AS first_activity_at,
          MAX(gateway_usage_meter_events.occurred_at) AS last_activity_at
        FROM gateway_usage_meter_events
        INNER JOIN organizations AS counterparty
          ON counterparty.id = gateway_usage_meter_events.provider_organization_id
        WHERE gateway_usage_meter_events.customer_organization_id = $1
          AND gateway_usage_meter_events.occurred_at >= $2
          AND gateway_usage_meter_events.occurred_at < $3
        GROUP BY
          gateway_usage_meter_events.provider_organization_id,
          counterparty.name,
          counterparty.slug
        ORDER BY gateway_usage_meter_events.provider_organization_id ASC
      `,
      [organizationId, startDateInclusive, endDateExclusive]
    );

    for (const row of outgoingUsage.rows) {
      const current = ensureExposure({
        counterpartyOrganizationId: row.counterparty_organization_id,
        counterpartyOrganizationName: row.counterparty_name,
        counterpartyOrganizationSlug: row.counterparty_slug
      });
      current.outgoingUsageEventCount = Number.parseInt(row.usage_event_count, 10);
      current.outgoingUsageTotalTokens = Number.parseInt(
        row.usage_total_tokens,
        10
      );
      mergeActivityWindow(current, row.first_activity_at, row.last_activity_at);
    }

    const incomingUsage = await this.pool.query<CounterpartyUsageAggregateRow>(
      `
        SELECT
          gateway_usage_meter_events.customer_organization_id AS counterparty_organization_id,
          counterparty.name AS counterparty_name,
          counterparty.slug AS counterparty_slug,
          COUNT(*)::text AS usage_event_count,
          COALESCE(SUM(gateway_usage_meter_events.total_tokens), 0)::text AS usage_total_tokens,
          MIN(gateway_usage_meter_events.occurred_at) AS first_activity_at,
          MAX(gateway_usage_meter_events.occurred_at) AS last_activity_at
        FROM gateway_usage_meter_events
        INNER JOIN organizations AS counterparty
          ON counterparty.id = gateway_usage_meter_events.customer_organization_id
        WHERE gateway_usage_meter_events.provider_organization_id = $1
          AND gateway_usage_meter_events.occurred_at >= $2
          AND gateway_usage_meter_events.occurred_at < $3
        GROUP BY
          gateway_usage_meter_events.customer_organization_id,
          counterparty.name,
          counterparty.slug
        ORDER BY gateway_usage_meter_events.customer_organization_id ASC
      `,
      [organizationId, startDateInclusive, endDateExclusive]
    );

    for (const row of incomingUsage.rows) {
      const current = ensureExposure({
        counterpartyOrganizationId: row.counterparty_organization_id,
        counterpartyOrganizationName: row.counterparty_name,
        counterpartyOrganizationSlug: row.counterparty_slug
      });
      current.incomingUsageEventCount = Number.parseInt(row.usage_event_count, 10);
      current.incomingUsageTotalTokens = Number.parseInt(
        row.usage_total_tokens,
        10
      );
      mergeActivityWindow(current, row.first_activity_at, row.last_activity_at);
    }

    const sharedMembers = await this.pool.query<SharedMemberAggregateRow>(
      `
        SELECT
          other_members.organization_id AS counterparty_organization_id,
          counterparty.name AS counterparty_name,
          counterparty.slug AS counterparty_slug,
          users.email AS shared_member_email
        FROM organization_members AS base_members
        INNER JOIN organization_members AS other_members
          ON other_members.user_id = base_members.user_id
         AND other_members.organization_id <> base_members.organization_id
        INNER JOIN users
          ON users.id = base_members.user_id
        INNER JOIN organizations AS counterparty
          ON counterparty.id = other_members.organization_id
        WHERE base_members.organization_id = $1
        ORDER BY other_members.organization_id ASC, users.email ASC
      `,
      [organizationId]
    );

    for (const row of sharedMembers.rows) {
      const current = ensureExposure({
        counterpartyOrganizationId: row.counterparty_organization_id,
        counterpartyOrganizationName: row.counterparty_name,
        counterpartyOrganizationSlug: row.counterparty_slug
      });
      current.sharedMemberEmails.push(row.shared_member_email);
    }

    return Array.from(exposures.values())
      .sort((left, right) =>
        left.counterpartyOrganizationId.localeCompare(
          right.counterpartyOrganizationId
        )
      )
      .map((exposure) =>
        FraudGraphCounterpartyExposure.create({
          organizationId,
          counterpartyOrganizationId: exposure.counterpartyOrganizationId,
          counterpartyOrganizationName: exposure.counterpartyOrganizationName,
          counterpartyOrganizationSlug: exposure.counterpartyOrganizationSlug,
          sharedMemberEmails: exposure.sharedMemberEmails,
          outgoingSettlementCount: exposure.outgoingSettlementCount,
          outgoingSettledUsd: UsdAmount.createFromCents(
            exposure.outgoingSettledCents
          ).toUsdString(),
          outgoingUsageEventCount: exposure.outgoingUsageEventCount,
          outgoingUsageTotalTokens: exposure.outgoingUsageTotalTokens,
          incomingSettlementCount: exposure.incomingSettlementCount,
          incomingSettledUsd: UsdAmount.createFromCents(
            exposure.incomingSettledCents
          ).toUsdString(),
          incomingUsageEventCount: exposure.incomingUsageEventCount,
          incomingUsageTotalTokens: exposure.incomingUsageTotalTokens,
          firstActivityAt: exposure.firstActivityAt?.toISOString() ?? null,
          lastActivityAt: exposure.lastActivityAt?.toISOString() ?? null
        })
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

  public async findProviderNodeByOrganization(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<ProviderNode | null> {
    const summary = await this.findProviderInventorySummary(
      organizationId,
      providerNodeId
    );

    return summary?.node ?? null;
  }

  public async createProviderNodeAttestationChallenge(
    challenge: ProviderNodeAttestationChallenge
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO provider_node_attestation_challenges (
          id,
          provider_node_id,
          nonce,
          created_at,
          expires_at,
          used_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        challenge.id,
        challenge.providerNodeId.value,
        challenge.nonce,
        challenge.createdAt,
        challenge.expiresAt,
        challenge.usedAt
      ]
    );
  }

  public async findProviderNodeAttestationChallenge(
    providerNodeId: ProviderNodeId,
    challengeId: string
  ): Promise<ProviderNodeAttestationChallenge | null> {
    const result = await this.pool.query<ProviderNodeAttestationChallengeRow>(
      `
        SELECT id, provider_node_id, nonce, created_at, expires_at, used_at
        FROM provider_node_attestation_challenges
        WHERE provider_node_id = $1
          AND id = $2
      `,
      [providerNodeId.value, challengeId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return ProviderNodeAttestationChallenge.rehydrate({
      id: row.id,
      providerNodeId: row.provider_node_id,
      nonce: row.nonce,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedAt: row.used_at
    });
  }

  public async markProviderNodeAttestationChallengeUsed(
    providerNodeId: ProviderNodeId,
    challengeId: string,
    usedAt: Date
  ): Promise<boolean> {
    const result = await this.pool.query(
      `
        UPDATE provider_node_attestation_challenges
        SET used_at = $3
        WHERE provider_node_id = $1
          AND id = $2
          AND used_at IS NULL
      `,
      [providerNodeId.value, challengeId, usedAt]
    );

    return (result.rowCount ?? 0) === 1;
  }

  public async createProviderNodeAttestationRecord(
    record: ProviderNodeAttestationRecord
  ): Promise<void> {
    const snapshot = record.toSnapshot();

    await this.pool.query(
      `
        INSERT INTO provider_node_attestations (
          id,
          provider_node_id,
          challenge_id,
          attestation_type,
          attestation_public_key_fingerprint,
          quoted_at,
          secure_boot_enabled,
          pcr_values,
          verified,
          failure_reason,
          recorded_at,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
      `,
      [
        snapshot.id,
        snapshot.providerNodeId,
        snapshot.challengeId,
        snapshot.attestationType,
        snapshot.attestationPublicKeyFingerprint,
        new Date(snapshot.quotedAt),
        snapshot.secureBootEnabled,
        JSON.stringify(snapshot.pcrValues),
        snapshot.verified,
        snapshot.failureReason,
        new Date(snapshot.recordedAt),
        snapshot.expiresAt === null ? null : new Date(snapshot.expiresAt)
      ]
    );
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

  public async replaceProviderNodeWarmModelStates(
    providerNodeId: ProviderNodeId,
    warmModelStates: readonly ProviderWarmModelState[]
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          DELETE FROM provider_node_warm_model_states
          WHERE provider_node_id = $1
        `,
        [providerNodeId.value]
      );

      for (const warmModelState of warmModelStates) {
        await client.query(
          `
            INSERT INTO provider_node_warm_model_states (
              provider_node_id,
              approved_model_alias,
              declared_at,
              expires_at
            )
            VALUES ($1, $2, $3, $4)
          `,
          [
            providerNodeId.value,
            warmModelState.approvedModelAlias,
            warmModelState.declaredAt,
            warmModelState.expiresAt
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
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17
        )
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
    const attestationResult = await this.pool.query<ProviderNodeAttestationRow>(
      `
        SELECT
          id,
          provider_node_id,
          challenge_id,
          attestation_type,
          attestation_public_key_fingerprint,
          quoted_at,
          secure_boot_enabled,
          pcr_values,
          verified,
          failure_reason,
          recorded_at,
          expires_at
        FROM provider_node_attestations
        WHERE provider_node_id = $1
        ORDER BY recorded_at DESC
      `,
      [providerNodeId.value]
    );
    const challengeResult =
      await this.pool.query<ProviderNodeAttestationChallengeRow>(
        `
          SELECT
            id,
            provider_node_id,
            nonce,
            created_at,
            expires_at,
            used_at
          FROM provider_node_attestation_challenges
          WHERE provider_node_id = $1
          ORDER BY created_at DESC
        `,
        [providerNodeId.value]
      );
    const warmModelStateResult =
      await this.pool.query<ProviderNodeWarmModelStateRow>(
        `
          SELECT
            provider_node_id,
            approved_model_alias,
            declared_at,
            expires_at
          FROM provider_node_warm_model_states
          WHERE provider_node_id = $1
            AND expires_at > $2
          ORDER BY approved_model_alias ASC
        `,
        [providerNodeId.value, this.clock()]
      );

    return this.toProviderInventorySummary(
      nodeRow,
      gpuResult.rows,
      benchmarkResult.rows[0],
      attestationResult.rows,
      challengeResult.rows,
      warmModelStateResult.rows
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
      | undefined,
    attestationRows: readonly ProviderNodeAttestationRow[],
    challengeRows: readonly ProviderNodeAttestationChallengeRow[],
    warmModelStateRows: readonly ProviderNodeWarmModelStateRow[]
  ): ProviderInventorySummary {
    const attestation = this.buildProviderNodeAttestationSnapshot(
      nodeRow.trust_tier,
      attestationRows,
      challengeRows
    );

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
      attestation,
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
      routingState: {
        warmModelAliases: warmModelStateRows.map((warmModelState) => ({
          approvedModelAlias: warmModelState.approved_model_alias,
          declaredAt: warmModelState.declared_at.toISOString(),
          expiresAt: warmModelState.expires_at.toISOString()
        }))
      },
      enrolledAt: nodeRow.enrolled_at
    });

    return new ProviderInventorySummary(
      providerNode,
      latestBenchmark === undefined || latestBenchmark === null
        ? null
        : this.toProviderBenchmarkReport(latestBenchmark)
    );
  }

  private buildProviderNodeAttestationSnapshot(
    baseTrustTier: string,
    attestationRows: readonly ProviderNodeAttestationRow[],
    challengeRows: readonly ProviderNodeAttestationChallengeRow[]
  ): ProviderNodeAttestationSnapshot {
    const now = this.clock();
    const latestAttestation = attestationRows[0];
    const latestChallenge = challengeRows[0];

    if (latestAttestation?.verified === true && latestAttestation.expires_at) {
      const status =
        latestAttestation.expires_at.getTime() > now.getTime()
          ? "verified"
          : "expired";

      return {
        status,
        lastAttestedAt: latestAttestation.recorded_at.toISOString(),
        attestationExpiresAt: latestAttestation.expires_at.toISOString(),
        attestationType: latestAttestation.attestation_type as "tpm_quote_v1",
        effectiveTrustTier: resolveEffectiveProviderTrustTier({
          baseTrustTier: baseTrustTier as
            | "t0_community"
            | "t1_vetted"
            | "t2_attested",
          attestationStatus: status
        })
      };
    }

    if (
      latestChallenge?.used_at === null &&
      latestChallenge.expires_at.getTime() > now.getTime()
    ) {
      return {
        status: "pending",
        lastAttestedAt: null,
        attestationExpiresAt: latestChallenge.expires_at.toISOString(),
        attestationType: null,
        effectiveTrustTier: resolveEffectiveProviderTrustTier({
          baseTrustTier: baseTrustTier as
            | "t0_community"
            | "t1_vetted"
            | "t2_attested",
          attestationStatus: "pending"
        })
      };
    }

    if (latestAttestation?.verified === false) {
      return {
        status: "failed",
        lastAttestedAt: null,
        attestationExpiresAt: null,
        attestationType: latestAttestation.attestation_type as "tpm_quote_v1",
        effectiveTrustTier: resolveEffectiveProviderTrustTier({
          baseTrustTier: baseTrustTier as
            | "t0_community"
            | "t1_vetted"
            | "t2_attested",
          attestationStatus: "failed"
        })
      };
    }

    return {
      status: "none",
      lastAttestedAt: null,
      attestationExpiresAt: null,
      attestationType: null,
      effectiveTrustTier: resolveEffectiveProviderTrustTier({
        baseTrustTier: baseTrustTier as
          | "t0_community"
          | "t1_vetted"
          | "t2_attested",
        attestationStatus: "none"
      })
    };
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
    const attestationResult = await this.pool.query<ProviderNodeAttestationRow>(
      `
        SELECT
          a.id,
          a.provider_node_id,
          a.challenge_id,
          a.attestation_type,
          a.attestation_public_key_fingerprint,
          a.quoted_at,
          a.secure_boot_enabled,
          a.pcr_values,
          a.verified,
          a.failure_reason,
          a.recorded_at,
          a.expires_at
        FROM provider_node_attestations AS a
        INNER JOIN provider_nodes AS n ON n.id = a.provider_node_id
        ${inventoryFilter}
        ORDER BY a.provider_node_id ASC, a.recorded_at DESC
      `,
      benchmarkParams
    );
    const challengeResult =
      await this.pool.query<ProviderNodeAttestationChallengeRow>(
        `
          SELECT
            c.id,
            c.provider_node_id,
            c.nonce,
            c.created_at,
            c.expires_at,
            c.used_at
          FROM provider_node_attestation_challenges AS c
          INNER JOIN provider_nodes AS n ON n.id = c.provider_node_id
          ${inventoryFilter}
          ORDER BY c.provider_node_id ASC, c.created_at DESC
        `,
        benchmarkParams
      );
    const warmModelStateResult =
      await this.pool.query<ProviderNodeWarmModelStateRow>(
        `
          SELECT
            s.provider_node_id,
            s.approved_model_alias,
            s.declared_at,
            s.expires_at
          FROM provider_node_warm_model_states AS s
          INNER JOIN provider_nodes AS n ON n.id = s.provider_node_id
          ${inventoryFilter}
          ${organizationId === null ? "WHERE" : "AND"} s.expires_at > $${String(benchmarkParams.length + 1)}
          ORDER BY s.provider_node_id ASC, s.approved_model_alias ASC
        `,
        [...benchmarkParams, this.clock()]
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
    const attestationsByNodeId = new Map<
      string,
      ProviderNodeAttestationRow[]
    >();
    const challengesByNodeId = new Map<
      string,
      ProviderNodeAttestationChallengeRow[]
    >();
    const warmModelStatesByNodeId = new Map<
      string,
      ProviderNodeWarmModelStateRow[]
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

    for (const row of attestationResult.rows) {
      const rows = attestationsByNodeId.get(row.provider_node_id) ?? [];
      rows.push(row);
      attestationsByNodeId.set(row.provider_node_id, rows);
    }

    for (const row of challengeResult.rows) {
      const rows = challengesByNodeId.get(row.provider_node_id) ?? [];
      rows.push(row);
      challengesByNodeId.set(row.provider_node_id, rows);
    }

    for (const row of warmModelStateResult.rows) {
      const rows = warmModelStatesByNodeId.get(row.provider_node_id) ?? [];
      rows.push(row);
      warmModelStatesByNodeId.set(row.provider_node_id, rows);
    }

    return nodeResult.rows.map((row) =>
      this.toProviderInventorySummary(
        row,
        gpusByNodeId.get(row.id) ?? [],
        latestBenchmarkByNodeId.get(row.id),
        attestationsByNodeId.get(row.id) ?? [],
        challengesByNodeId.get(row.id) ?? [],
        warmModelStatesByNodeId.get(row.id) ?? []
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
    string | null,
    number,
    string | null,
    string | null,
    number | null,
    number | null,
    boolean | null,
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
      snapshot.approvedModelAlias,
      snapshot.candidateCount,
      snapshot.selectedProviderNodeId,
      snapshot.selectedProviderOrganizationId,
      snapshot.selectionScore,
      snapshot.pricePerformanceScore,
      snapshot.warmCacheMatched,
      snapshot.rejectionReason,
      new Date(snapshot.createdAt)
    ];
  }

  private toUtcDateKey(input: Date): string {
    return input.toISOString().slice(0, 10);
  }

  private mapProviderPayoutAccountRow(
    row: ProviderPayoutAccountRow | undefined
  ): ProviderPayoutAccount | null {
    if (row === undefined) {
      return null;
    }

    return ProviderPayoutAccount.create({
      organizationId: row.organization_id,
      stripeAccountId: row.stripe_account_id,
      chargesEnabled: row.charges_enabled,
      payoutsEnabled: row.payouts_enabled,
      detailsSubmitted: row.details_submitted,
      country: row.country,
      defaultCurrency: row.default_currency,
      requirementsCurrentlyDue: row.requirements_currently_due,
      requirementsEventuallyDue: row.requirements_eventually_due,
      lastStripeSyncAt: row.last_stripe_sync_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  private mapProviderPayoutDisbursementRow(
    row: ProviderPayoutDisbursementRow | undefined
  ): ProviderPayoutDisbursement | null {
    if (row === undefined) {
      return null;
    }

    return ProviderPayoutDisbursement.rehydrate({
      id: row.id,
      payoutRunId: row.payout_run_id,
      providerOrganizationId: row.provider_organization_id,
      stripeAccountId: row.stripe_account_id,
      stripeTransferId: row.stripe_transfer_id,
      stripePayoutId: row.stripe_payout_id,
      idempotencyKey: row.idempotency_key,
      amountCents: Number.parseInt(row.amount_cents, 10),
      currency: row.currency,
      status: row.status,
      failureCode: row.failure_code,
      failureMessage: row.failure_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paidAt: row.paid_at,
      failedAt: row.failed_at,
      canceledAt: row.canceled_at
    });
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
