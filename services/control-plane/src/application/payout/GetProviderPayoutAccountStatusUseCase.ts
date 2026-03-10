import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import { ProviderPayoutAccountNotFoundError } from "./PayoutErrors.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderPayoutRepository } from "./ports/ProviderPayoutRepository.js";
import type { StripeConnectClient } from "./ports/StripeConnectClient.js";
import { assertProviderFinanceAccess } from "./GetProviderPayoutAvailabilityUseCase.js";
import { ProviderPayoutAccount } from "../../domain/payout/ProviderPayoutAccount.js";

export interface GetProviderPayoutAccountStatusRequest {
  organizationId: string;
  actorUserId: string;
}

export class GetProviderPayoutAccountStatusUseCase {
  public constructor(
    private readonly repository: ProviderPayoutRepository,
    private readonly stripeConnectClient: StripeConnectClient,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: GetProviderPayoutAccountStatusRequest
  ): Promise<{
    payoutAccount: {
      accountId: string;
      onboardingStatus: "pending" | "completed";
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      detailsSubmitted: boolean;
      country: string;
      defaultCurrency: string;
      requirementsCurrentlyDue: readonly string[];
      requirementsEventuallyDue: readonly string[];
      lastStripeSyncAt: string;
    };
  }> {
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    await assertProviderFinanceAccess(
      this.repository,
      organizationId,
      actorUserId
    );

    const existing =
      await this.repository.findProviderPayoutAccountByOrganizationId(
        organizationId
      );

    if (existing === null) {
      throw new ProviderPayoutAccountNotFoundError(organizationId.value);
    }

    const occurredAt = this.clock();
    const account = await this.stripeConnectClient.retrieveAccount(
      existing.stripeAccountId
    );
    const synced = ProviderPayoutAccount.create({
      organizationId: organizationId.value,
      stripeAccountId: account.accountId,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      detailsSubmitted: account.detailsSubmitted,
      country: account.country,
      defaultCurrency: account.defaultCurrency,
      requirementsCurrentlyDue: account.requirementsCurrentlyDue,
      requirementsEventuallyDue: account.requirementsEventuallyDue,
      lastStripeSyncAt: occurredAt,
      createdAt: existing.createdAt,
      updatedAt: occurredAt
    });
    await this.repository.upsertProviderPayoutAccount(synced);
    await this.auditLog.record({
      eventName: "finance.provider_payout_account.synced",
      occurredAt: occurredAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        stripeAccountId: synced.stripeAccountId,
        onboardingStatus: synced.onboardingStatus,
        chargesEnabled: synced.chargesEnabled,
        payoutsEnabled: synced.payoutsEnabled,
        detailsSubmitted: synced.detailsSubmitted
      }
    });

    return {
      payoutAccount: {
        accountId: synced.stripeAccountId,
        onboardingStatus: synced.onboardingStatus,
        chargesEnabled: synced.chargesEnabled,
        payoutsEnabled: synced.payoutsEnabled,
        detailsSubmitted: synced.detailsSubmitted,
        country: synced.country,
        defaultCurrency: synced.defaultCurrency,
        requirementsCurrentlyDue: synced.requirementsCurrentlyDue,
        requirementsEventuallyDue: synced.requirementsEventuallyDue,
        lastStripeSyncAt: synced.lastStripeSyncAt.toISOString()
      }
    };
  }
}
