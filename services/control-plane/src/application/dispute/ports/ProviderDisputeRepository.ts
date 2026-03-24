import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type {
  ProviderDisputeCase,
  ProviderDisputeStatus,
} from "../../../domain/dispute/ProviderDisputeCase.js";
import type { UsdAmount } from "../../../domain/ledger/UsdAmount.js";

export interface ProviderDisputeRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId,
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<OrganizationMember | null>;
  hasCustomerChargeReference(input: {
    buyerOrganizationId: OrganizationId;
    paymentReference: string;
  }): Promise<boolean>;
  findBuyerOrganizationIdByPaymentReference(
    paymentReference: string,
  ): Promise<OrganizationId | null>;
  hasProviderSettlementReference(input: {
    buyerOrganizationId: OrganizationId;
    providerOrganizationId: OrganizationId;
    jobReference: string;
  }): Promise<boolean>;
  createProviderDisputeCase(dispute: ProviderDisputeCase): Promise<void>;
  updateProviderDisputeCase(dispute: ProviderDisputeCase): Promise<void>;
  findProviderDisputeCaseById(disputeId: string): Promise<ProviderDisputeCase | null>;
  findProviderDisputeCaseByStripeDisputeId(
    stripeDisputeId: string,
  ): Promise<ProviderDisputeCase | null>;
  findChargebackDisputeByPaymentReference(input: {
    buyerOrganizationId: OrganizationId;
    paymentReference: string;
  }): Promise<ProviderDisputeCase | null>;
  listBuyerOrganizationDisputes(input: {
    buyerOrganizationId: OrganizationId;
    status?: ProviderDisputeStatus;
  }): Promise<readonly ProviderDisputeCase[]>;
  listProviderOrganizationDisputes(
    providerOrganizationId: OrganizationId,
  ): Promise<readonly ProviderDisputeCase[]>;
  getProviderDisputeSummary(input: {
    providerOrganizationId: OrganizationId;
    lostSinceInclusive: Date;
  }): Promise<{
    activeDisputeCount: number;
    activeDisputeHold: UsdAmount;
    recentLostDisputeCount: number;
  }>;
  getActiveProviderDisputeHold(
    providerOrganizationId: OrganizationId,
  ): Promise<UsdAmount>;
  listRecentLostDisputeCountsByProviderOrganization(input: {
    lostSinceInclusive: Date;
  }): Promise<
    readonly {
      providerOrganizationId: string;
      lostDisputeCount: number;
    }[]
  >;
  recordStripeDisputeWebhookReceipt(input: {
    eventId: string;
    eventType: string;
    receivedAt: Date;
    payload: Record<string, unknown>;
  }): Promise<boolean>;
}
