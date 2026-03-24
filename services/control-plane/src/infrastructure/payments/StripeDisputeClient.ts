import Stripe from "stripe";
import { StripeWebhookSignatureVerificationError } from "../../application/payout/PayoutErrors.js";
import type {
  StripeDisputeClient,
  StripeDisputeWebhookEnvelope,
} from "../../application/dispute/ports/StripeDisputeClient.js";
import type { ProviderDisputeStatus } from "../../domain/dispute/ProviderDisputeCase.js";

export class StripeSdkDisputeClient implements StripeDisputeClient {
  private readonly stripe: Stripe;

  public constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  public async verifyWebhook(input: {
    payload: string;
    signature: string;
  }): Promise<StripeDisputeWebhookEnvelope> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        input.payload,
        input.signature,
        this.webhookSecret,
      );
    } catch {
      throw new StripeWebhookSignatureVerificationError();
    }

    if (
      event.type !== "charge.dispute.created" &&
      event.type !== "charge.dispute.updated" &&
      event.type !== "charge.dispute.closed" &&
      event.type !== "charge.dispute.funds_withdrawn" &&
      event.type !== "charge.dispute.funds_reinstated"
    ) {
      return {
        id: event.id,
        type: "unsupported",
      };
    }

    const dispute = event.data.object;
    const chargeId =
      typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
    const charge = await this.stripe.charges.retrieve(chargeId);
    const paymentReference =
      typeof charge.metadata.paymentReference === "string"
        ? charge.metadata.paymentReference
        : null;
    const stripeReason =
      typeof dispute.reason === "string" ? dispute.reason : "stripe_dispute";

    return {
      id: event.id,
      type: event.type,
      stripeDisputeId: dispute.id,
      stripeChargeId: chargeId,
      paymentReference:
        paymentReference === null || paymentReference.trim().length === 0
          ? null
          : paymentReference.trim(),
      disputedAmountUsd: this.centsToUsdString(dispute.amount),
      reasonCode: stripeReason,
      summary: this.buildSummary(event.type, dispute),
      stripeReason,
      stripeStatus: dispute.status,
      nextStatus: this.mapStatus(event.type, dispute.status),
    };
  }

  private centsToUsdString(amountCents: number): string {
    return (amountCents / 100).toFixed(2);
  }

  private buildSummary(eventType: Stripe.Event.Type, dispute: Stripe.Dispute): string {
    const statusLabel = dispute.status.replaceAll("_", " ");
    const reasonLabel =
      (typeof dispute.reason === "string" ? dispute.reason : "unknown").replaceAll(
        "_",
        " ",
      );

    return `Stripe dispute ${eventType} (${statusLabel}) for reason ${reasonLabel}.`;
  }

  private mapStatus(
    eventType:
      | "charge.dispute.created"
      | "charge.dispute.updated"
      | "charge.dispute.closed"
      | "charge.dispute.funds_withdrawn"
      | "charge.dispute.funds_reinstated",
    stripeStatus: Stripe.Dispute.Status,
  ): ProviderDisputeStatus {
    if (eventType === "charge.dispute.funds_reinstated") {
      return "recovered";
    }

    if (eventType === "charge.dispute.funds_withdrawn") {
      return "lost";
    }

    switch (stripeStatus) {
      case "warning_needs_response":
      case "needs_response":
        return "open";
      case "warning_under_review":
      case "under_review":
        return "under_review";
      case "won":
        return "won";
      case "lost":
        return "lost";
      case "warning_closed":
        return "canceled";
    }

    throw new Error(`Unsupported Stripe dispute status: ${stripeStatus}`);
  }
}
