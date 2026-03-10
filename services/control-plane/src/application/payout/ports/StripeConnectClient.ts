export interface StripeConnectAccountSnapshot {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country: string;
  defaultCurrency: string;
  requirementsCurrentlyDue: readonly string[];
  requirementsEventuallyDue: readonly string[];
}

export interface StripeConnectWebhookAccountEvent {
  id: string;
  type: "account.updated" | "capability.updated";
  account: StripeConnectAccountSnapshot;
}

export interface StripeConnectWebhookPayoutEvent {
  id: string;
  type: "payout.paid" | "payout.failed" | "payout.canceled";
  payoutId: string;
  accountId: string;
  failureCode: string | null;
  failureMessage: string | null;
}

export interface StripeConnectUnsupportedWebhookEvent {
  id: string;
  type: "unsupported";
}

export type StripeConnectWebhookEvent =
  | StripeConnectWebhookAccountEvent
  | StripeConnectWebhookPayoutEvent
  | StripeConnectUnsupportedWebhookEvent;

export interface StripeConnectClient {
  createExpressAccount(input: {
    organizationId: string;
    country: string;
  }): Promise<StripeConnectAccountSnapshot>;
  createOnboardingLink(input: {
    accountId: string;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{
    accountId: string;
    onboardingUrl: string;
    expiresAt: string;
  }>;
  retrieveAccount(accountId: string): Promise<StripeConnectAccountSnapshot>;
  createTransfer(input: {
    accountId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{
    transferId: string;
  }>;
  createPayout(input: {
    accountId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{
    payoutId: string;
  }>;
  verifyWebhook(input: {
    payload: string;
    signature: string;
  }): StripeConnectWebhookEvent;
}
