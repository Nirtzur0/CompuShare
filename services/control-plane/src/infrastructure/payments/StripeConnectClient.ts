import Stripe from "stripe";
import { StripeWebhookSignatureVerificationError } from "../../application/payout/PayoutErrors.js";
import type {
  StripeConnectAccountSnapshot,
  StripeConnectClient,
  StripeConnectWebhookEvent
} from "../../application/payout/ports/StripeConnectClient.js";

export class StripeSdkConnectClient implements StripeConnectClient {
  private readonly stripe: Stripe;

  public constructor(
    secretKey: string,
    private readonly webhookSecret: string
  ) {
    this.stripe = new Stripe(secretKey);
  }

  public async createExpressAccount(input: {
    organizationId: string;
    country: string;
  }): Promise<StripeConnectAccountSnapshot> {
    const account = await this.stripe.accounts.create({
      type: "express",
      country: input.country,
      metadata: {
        organizationId: input.organizationId
      }
    });

    return this.mapAccount(account);
  }

  public async createOnboardingLink(input: {
    accountId: string;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{
    accountId: string;
    onboardingUrl: string;
    expiresAt: string;
  }> {
    const link = await this.stripe.accountLinks.create({
      account: input.accountId,
      type: "account_onboarding",
      return_url: input.returnUrl,
      refresh_url: input.refreshUrl
    });

    return {
      accountId: input.accountId,
      onboardingUrl: link.url,
      expiresAt: new Date(link.expires_at * 1000).toISOString()
    };
  }

  public async retrieveAccount(
    accountId: string
  ): Promise<StripeConnectAccountSnapshot> {
    return this.mapAccount(await this.stripe.accounts.retrieve(accountId));
  }

  public async createTransfer(input: {
    accountId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{
    transferId: string;
  }> {
    const transfer = await this.stripe.transfers.create(
      {
        amount: input.amountCents,
        currency: input.currency,
        destination: input.accountId
      },
      {
        idempotencyKey: input.idempotencyKey
      }
    );

    return {
      transferId: transfer.id
    };
  }

  public async createPayout(input: {
    accountId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{
    payoutId: string;
  }> {
    const payout = await this.stripe.payouts.create(
      {
        amount: input.amountCents,
        currency: input.currency
      },
      {
        stripeAccount: input.accountId,
        idempotencyKey: input.idempotencyKey
      }
    );

    return {
      payoutId: payout.id
    };
  }

  public verifyWebhook(input: {
    payload: string;
    signature: string;
  }): StripeConnectWebhookEvent {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        input.payload,
        input.signature,
        this.webhookSecret
      );
    } catch {
      throw new StripeWebhookSignatureVerificationError();
    }

    if (event.type === "account.updated") {
      return {
        id: event.id,
        type: "account.updated",
        account: this.mapAccount(event.data.object)
      };
    }

    if (event.type === "capability.updated") {
      const capability = event.data.object;
      const capabilityAccountId =
        typeof capability.account === "string"
          ? capability.account
          : capability.account.id;
      return {
        id: event.id,
        type: "capability.updated",
        account: {
          accountId: capabilityAccountId,
          chargesEnabled: capability.status === "active",
          payoutsEnabled: capability.status === "active",
          detailsSubmitted: capability.status === "active",
          country: "US",
          defaultCurrency: "usd",
          requirementsCurrentlyDue: [],
          requirementsEventuallyDue: []
        }
      };
    }

    if (
      event.type === "payout.paid" ||
      event.type === "payout.failed" ||
      event.type === "payout.canceled"
    ) {
      const payout = event.data.object;
      return {
        id: event.id,
        type: event.type,
        payoutId: payout.id,
        accountId:
          typeof event.account === "string"
            ? event.account
            : typeof payout.destination === "string"
              ? payout.destination
              : "",
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message
      };
    }

    return {
      id: event.id,
      type: "unsupported"
    };
  }

  private mapAccount(account: Stripe.Account): StripeConnectAccountSnapshot {
    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      country: account.country ?? "US",
      defaultCurrency: account.default_currency ?? "usd",
      requirementsCurrentlyDue: [
        ...(account.requirements?.currently_due ?? [])
      ].sort(),
      requirementsEventuallyDue: [
        ...(account.requirements?.eventually_due ?? [])
      ].sort()
    };
  }
}
