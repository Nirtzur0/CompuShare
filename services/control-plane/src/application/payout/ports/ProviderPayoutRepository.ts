import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { OrganizationWalletSummary } from "../../../domain/ledger/OrganizationWalletSummary.js";
import type { ProviderPayoutAccount } from "../../../domain/payout/ProviderPayoutAccount.js";
import type { ProviderPayoutAvailability } from "../../../domain/payout/ProviderPayoutAvailability.js";
import type { ProviderPayoutDisbursement } from "../../../domain/payout/ProviderPayoutDisbursement.js";
import type { ProviderPayoutRun } from "../../../domain/payout/ProviderPayoutRun.js";
import type { UsdAmount } from "../../../domain/ledger/UsdAmount.js";

export interface ProviderPayoutRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  getOrganizationWalletSummary(
    organizationId: OrganizationId
  ): Promise<OrganizationWalletSummary>;
  listProviderOrganizationIds(input: {
    providerOrganizationId?: OrganizationId;
  }): Promise<readonly string[]>;
  findProviderPayoutAccountByOrganizationId(
    organizationId: OrganizationId
  ): Promise<ProviderPayoutAccount | null>;
  findProviderPayoutAccountByStripeAccountId(
    stripeAccountId: string
  ): Promise<ProviderPayoutAccount | null>;
  upsertProviderPayoutAccount(account: ProviderPayoutAccount): Promise<void>;
  getProviderPayoutAvailability(
    organizationId: OrganizationId
  ): Promise<ProviderPayoutAvailability>;
  createProviderPayoutRun(run: ProviderPayoutRun): Promise<void>;
  updateProviderPayoutRun(run: ProviderPayoutRun): Promise<void>;
  createProviderPayoutDisbursement(
    disbursement: ProviderPayoutDisbursement
  ): Promise<void>;
  updateProviderPayoutDisbursement(
    disbursement: ProviderPayoutDisbursement
  ): Promise<void>;
  findProviderPayoutDisbursementByStripePayoutId(
    stripePayoutId: string
  ): Promise<ProviderPayoutDisbursement | null>;
  recordStripeWebhookReceipt(input: {
    eventId: string;
    eventType: string;
    receivedAt: Date;
    payload: Record<string, unknown>;
  }): Promise<boolean>;
  getActiveProviderDisputeHold(
    providerOrganizationId: OrganizationId
  ): Promise<UsdAmount>;
}
