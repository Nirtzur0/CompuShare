import type { AuditLog } from "../identity/ports/AuditLog.js";
import { ProviderPayoutAccount } from "../../domain/payout/ProviderPayoutAccount.js";
import type { ProviderPayoutRepository } from "./ports/ProviderPayoutRepository.js";
import type { StripeConnectClient } from "./ports/StripeConnectClient.js";

export interface ProcessStripeConnectWebhookRequest {
  payload: string;
  signature: string;
}

export class ProcessStripeConnectWebhookUseCase {
  public constructor(
    private readonly repository: ProviderPayoutRepository,
    private readonly stripeConnectClient: StripeConnectClient,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: ProcessStripeConnectWebhookRequest
  ): Promise<{ accepted: true }> {
    const occurredAt = this.clock();
    const event = this.stripeConnectClient.verifyWebhook({
      payload: request.payload,
      signature: request.signature
    });

    const firstReceipt = await this.repository.recordStripeWebhookReceipt({
      eventId: event.id,
      eventType: event.type,
      receivedAt: occurredAt,
      payload: JSON.parse(request.payload) as Record<string, unknown>
    });

    if (!firstReceipt) {
      return { accepted: true };
    }

    if (event.type === "unsupported") {
      return { accepted: true };
    }

    let auditOrganizationId = "00000000-0000-0000-0000-000000000000";

    if (
      event.type === "account.updated" ||
      event.type === "capability.updated"
    ) {
      const existing =
        await this.repository.findProviderPayoutAccountByStripeAccountId(
          event.account.accountId
        );

      if (existing !== null) {
        await this.repository.upsertProviderPayoutAccount(
          ProviderPayoutAccount.create({
            organizationId: existing.organizationId.value,
            stripeAccountId: event.account.accountId,
            chargesEnabled: event.account.chargesEnabled,
            payoutsEnabled: event.account.payoutsEnabled,
            detailsSubmitted: event.account.detailsSubmitted,
            country: event.account.country,
            defaultCurrency: event.account.defaultCurrency,
            requirementsCurrentlyDue: event.account.requirementsCurrentlyDue,
            requirementsEventuallyDue: event.account.requirementsEventuallyDue,
            lastStripeSyncAt: occurredAt,
            createdAt: existing.createdAt,
            updatedAt: occurredAt
          })
        );
        auditOrganizationId = existing.organizationId.value;
      }
    }

    if (
      event.type === "payout.paid" ||
      event.type === "payout.failed" ||
      event.type === "payout.canceled"
    ) {
      const disbursement =
        await this.repository.findProviderPayoutDisbursementByStripePayoutId(
          event.payoutId
        );

      if (disbursement !== null) {
        auditOrganizationId = disbursement.providerOrganizationId.value;
        const nextStatus =
          event.type === "payout.paid"
            ? disbursement.withStatus({
                status: "paid",
                updatedAt: occurredAt,
                paidAt: occurredAt
              })
            : event.type === "payout.failed"
              ? disbursement.withStatus({
                  status: "failed",
                  updatedAt: occurredAt,
                  failedAt: occurredAt,
                  failureCode: event.failureCode,
                  failureMessage: event.failureMessage
                })
              : disbursement.withStatus({
                  status: "canceled",
                  updatedAt: occurredAt,
                  canceledAt: occurredAt
                });

        await this.repository.updateProviderPayoutDisbursement(nextStatus);
      }
    }

    await this.auditLog.record({
      eventName: "finance.stripe_webhook.received",
      occurredAt: occurredAt.toISOString(),
      actorUserId: "00000000-0000-0000-0000-000000000001",
      organizationId: auditOrganizationId,
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type
      }
    });

    return { accepted: true };
  }
}
