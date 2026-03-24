import type { ProviderDisputeStatus } from "../../../domain/dispute/ProviderDisputeCase.js";

export interface StripeDisputeWebhookEvent {
  id: string;
  type:
    | "charge.dispute.created"
    | "charge.dispute.updated"
    | "charge.dispute.closed"
    | "charge.dispute.funds_withdrawn"
    | "charge.dispute.funds_reinstated";
  stripeDisputeId: string;
  stripeChargeId: string;
  paymentReference: string | null;
  disputedAmountUsd: string;
  reasonCode: string;
  summary: string;
  stripeReason: string;
  stripeStatus: string;
  nextStatus: ProviderDisputeStatus;
}

export interface StripeDisputeUnsupportedWebhookEvent {
  id: string;
  type: "unsupported";
}

export type StripeDisputeWebhookEnvelope =
  | StripeDisputeWebhookEvent
  | StripeDisputeUnsupportedWebhookEvent;

export interface StripeDisputeClient {
  verifyWebhook(input: {
    payload: string;
    signature: string;
  }): Promise<StripeDisputeWebhookEnvelope>;
}
