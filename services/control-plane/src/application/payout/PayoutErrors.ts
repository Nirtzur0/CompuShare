export class ProviderPayoutAccountNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(
      `Provider payout account for organization "${organizationId}" was not found.`
    );
    this.name = "ProviderPayoutAccountNotFoundError";
  }
}

export class StripeIntegrationNotConfiguredError extends Error {
  public constructor() {
    super(
      "Stripe Connect integration is not configured for this control-plane."
    );
    this.name = "StripeIntegrationNotConfiguredError";
  }
}

export class StripeWebhookSignatureVerificationError extends Error {
  public constructor() {
    super("The Stripe webhook signature is invalid.");
    this.name = "StripeWebhookSignatureVerificationError";
  }
}
