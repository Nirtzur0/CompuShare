import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import { ProviderPayoutAccount } from "../../domain/payout/ProviderPayoutAccount.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderPayoutRepository } from "./ports/ProviderPayoutRepository.js";
import type { StripeConnectClient } from "./ports/StripeConnectClient.js";
import { assertProviderFinanceAccess } from "./GetProviderPayoutAvailabilityUseCase.js";

export interface IssueProviderPayoutOnboardingLinkRequest {
  organizationId: string;
  actorUserId: string;
}

export class IssueProviderPayoutOnboardingLinkUseCase {
  public constructor(
    private readonly repository: ProviderPayoutRepository,
    private readonly stripeConnectClient: StripeConnectClient,
    private readonly auditLog: AuditLog,
    private readonly connectReturnUrlBase: string,
    private readonly connectRefreshUrlBase: string,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: IssueProviderPayoutOnboardingLinkRequest
  ): Promise<{
    accountId: string;
    onboardingUrl: string;
    expiresAt: string;
  }> {
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    await assertProviderFinanceAccess(
      this.repository,
      organizationId,
      actorUserId
    );

    const occurredAt = this.clock();
    let account =
      await this.repository.findProviderPayoutAccountByOrganizationId(
        organizationId
      );
    let wasCreated = false;

    if (account === null) {
      const created = await this.stripeConnectClient.createExpressAccount({
        organizationId: organizationId.value,
        country: "US"
      });
      account = ProviderPayoutAccount.create({
        organizationId: organizationId.value,
        stripeAccountId: created.accountId,
        chargesEnabled: created.chargesEnabled,
        payoutsEnabled: created.payoutsEnabled,
        detailsSubmitted: created.detailsSubmitted,
        country: created.country,
        defaultCurrency: created.defaultCurrency,
        requirementsCurrentlyDue: created.requirementsCurrentlyDue,
        requirementsEventuallyDue: created.requirementsEventuallyDue,
        lastStripeSyncAt: occurredAt,
        createdAt: occurredAt,
        updatedAt: occurredAt
      });
      await this.repository.upsertProviderPayoutAccount(account);
      wasCreated = true;
    }

    const link = await this.stripeConnectClient.createOnboardingLink({
      accountId: account.stripeAccountId,
      returnUrl: `${this.connectReturnUrlBase}/organizations/${organizationId.value}/finance/provider-payout-accounts/current`,
      refreshUrl: `${this.connectRefreshUrlBase}/organizations/${organizationId.value}/finance/provider-payout-accounts/onboarding-links`
    });

    if (wasCreated) {
      await this.auditLog.record({
        eventName: "finance.provider_payout_account.created",
        occurredAt: occurredAt.toISOString(),
        actorUserId: actorUserId.value,
        organizationId: organizationId.value,
        metadata: {
          stripeAccountId: account.stripeAccountId
        }
      });
    }

    await this.auditLog.record({
      eventName: "finance.provider_payout_account.onboarding_link_issued",
      occurredAt: occurredAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        stripeAccountId: account.stripeAccountId,
        expiresAt: link.expiresAt
      }
    });

    return link;
  }
}
