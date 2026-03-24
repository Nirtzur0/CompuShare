import type { AuditLog } from "../identity/ports/AuditLog.js";
import { ProviderDisputeCase } from "../../domain/dispute/ProviderDisputeCase.js";
import type { ProviderDisputeRepository } from "./ports/ProviderDisputeRepository.js";
import type { StripeDisputeClient } from "./ports/StripeDisputeClient.js";

export interface ProcessStripeDisputeWebhookRequest {
  payload: string;
  signature: string;
}

const SYSTEM_ACTOR_USER_ID = "00000000-0000-0000-0000-000000000001";
const UNKNOWN_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000000";

export class ProcessStripeDisputeWebhookUseCase {
  public constructor(
    private readonly repository: ProviderDisputeRepository,
    private readonly stripeDisputeClient: StripeDisputeClient,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    request: ProcessStripeDisputeWebhookRequest,
  ): Promise<{ accepted: true }> {
    const occurredAt = this.clock();
    const event = await this.stripeDisputeClient.verifyWebhook({
      payload: request.payload,
      signature: request.signature,
    });

    const firstReceipt = await this.repository.recordStripeDisputeWebhookReceipt({
      eventId: event.id,
      eventType: event.type,
      receivedAt: occurredAt,
      payload: JSON.parse(request.payload) as Record<string, unknown>,
    });

    if (!firstReceipt || event.type === "unsupported") {
      return { accepted: true };
    }

    if (event.paymentReference === null) {
      await this.auditLog.record({
        eventName: "finance.stripe_dispute_webhook.orphaned",
        occurredAt: occurredAt.toISOString(),
        actorUserId: SYSTEM_ACTOR_USER_ID,
        organizationId: UNKNOWN_ORGANIZATION_ID,
        metadata: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeDisputeId: event.stripeDisputeId,
          reason: "payment_reference_missing",
        },
      });

      return { accepted: true };
    }

    const buyerOrganizationId = await this.repository.findBuyerOrganizationIdByPaymentReference(
      event.paymentReference,
    );

    if (buyerOrganizationId === null) {
      await this.auditLog.record({
        eventName: "finance.stripe_dispute_webhook.orphaned",
        occurredAt: occurredAt.toISOString(),
        actorUserId: SYSTEM_ACTOR_USER_ID,
        organizationId: UNKNOWN_ORGANIZATION_ID,
        metadata: {
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeDisputeId: event.stripeDisputeId,
          paymentReference: event.paymentReference,
          reason: "buyer_charge_not_found",
        },
      });

      return { accepted: true };
    }

    const existingDispute =
      (await this.repository.findProviderDisputeCaseByStripeDisputeId(
        event.stripeDisputeId,
      )) ??
      (await this.repository.findChargebackDisputeByPaymentReference({
        buyerOrganizationId,
        paymentReference: event.paymentReference,
      }));

    const dispute =
      existingDispute === null
        ? ProviderDisputeCase.createChargeback({
            buyerOrganizationId: buyerOrganizationId.value,
            createdByUserId: null,
            paymentReference: event.paymentReference,
            disputedAmountUsd: event.disputedAmountUsd,
            reasonCode: event.reasonCode,
            summary: event.summary,
            source: "stripe_webhook",
            evidenceEntries: [],
            createdAt: occurredAt,
            stripeDisputeId: event.stripeDisputeId,
            stripeChargeId: event.stripeChargeId,
            stripeReason: event.stripeReason,
            stripeStatus: event.stripeStatus,
          })
        : existingDispute.syncStripeChargeback({
            disputedAmountUsd: event.disputedAmountUsd,
            reasonCode: event.reasonCode,
            summary: event.summary,
            stripeDisputeId: event.stripeDisputeId,
            stripeChargeId: event.stripeChargeId,
            stripeReason: event.stripeReason,
            stripeStatus: event.stripeStatus,
            nextStatus: event.nextStatus,
            occurredAt,
          });

    if (existingDispute === null) {
      await this.repository.createProviderDisputeCase(dispute);
    } else {
      await this.repository.updateProviderDisputeCase(dispute);
    }

    await this.auditLog.record({
      eventName: "finance.stripe_dispute_webhook.received",
      occurredAt: occurredAt.toISOString(),
      actorUserId: SYSTEM_ACTOR_USER_ID,
      organizationId: buyerOrganizationId.value,
      metadata: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        stripeDisputeId: event.stripeDisputeId,
        paymentReference: event.paymentReference,
        disputeId: dispute.id,
      },
    });

    return { accepted: true };
  }
}
