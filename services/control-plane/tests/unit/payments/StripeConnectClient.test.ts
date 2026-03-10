import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { StripeSdkConnectClient } from "../../../src/infrastructure/payments/StripeConnectClient.js";
import { StripeWebhookSignatureVerificationError } from "../../../src/application/payout/PayoutErrors.js";

describe("StripeSdkConnectClient", () => {
  it("maps account creation, onboarding links, retrieval, transfers, and payouts", async () => {
    const client = new StripeSdkConnectClient("sk_test_123", "whsec_test_123");
    const stubStripe = {
      accounts: {
        create: () =>
          Promise.resolve({
            id: "acct_123",
            charges_enabled: false,
            payouts_enabled: false,
            details_submitted: false,
            country: "US",
            default_currency: "usd",
            requirements: {
              currently_due: ["external_account"],
              eventually_due: []
            }
          }),
        retrieve: () =>
          Promise.resolve({
            id: "acct_123",
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true,
            country: "US",
            default_currency: "usd",
            requirements: {
              currently_due: [],
              eventually_due: []
            }
          })
      },
      accountLinks: {
        create: () =>
          Promise.resolve({
            url: "https://connect.stripe.test/onboarding/acct_123",
            expires_at: 1_773_110_400
          })
      },
      transfers: {
        create: () =>
          Promise.resolve({
            id: "tr_123"
          })
      },
      payouts: {
        create: () =>
          Promise.resolve({
            id: "po_123"
          })
      },
      webhooks: {
        constructEvent: () => ({
          id: "evt_unsupported",
          type: "review.closed"
        })
      }
    };

    (
      client as unknown as {
        stripe: typeof stubStripe;
      }
    ).stripe = stubStripe;

    await expect(
      client.createExpressAccount({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        country: "US"
      })
    ).resolves.toMatchObject({
      accountId: "acct_123",
      requirementsCurrentlyDue: ["external_account"]
    });
    await expect(
      client.createOnboardingLink({
        accountId: "acct_123",
        returnUrl: "http://127.0.0.1:3100/return",
        refreshUrl: "http://127.0.0.1:3100/refresh"
      })
    ).resolves.toMatchObject({
      accountId: "acct_123",
      onboardingUrl: "https://connect.stripe.test/onboarding/acct_123"
    });
    await expect(client.retrieveAccount("acct_123")).resolves.toMatchObject({
      payoutsEnabled: true
    });
    await expect(
      client.createTransfer({
        accountId: "acct_123",
        amountCents: 500,
        currency: "usd",
        idempotencyKey: "key:transfer"
      })
    ).resolves.toEqual({ transferId: "tr_123" });
    await expect(
      client.createPayout({
        accountId: "acct_123",
        amountCents: 500,
        currency: "usd",
        idempotencyKey: "key:payout"
      })
    ).resolves.toEqual({ payoutId: "po_123" });
    expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig"
      })
    ).toEqual({
      id: "evt_unsupported",
      type: "unsupported"
    });
  });

  it("verifies account, capability, and payout webhook events", () => {
    const client = new StripeSdkConnectClient("sk_test_123", "whsec_test_123");

    const events: Stripe.Event[] = [
      {
        id: "evt_account",
        object: "event",
        api_version: "2025-09-30.clover",
        created: 1,
        data: {
          object: {
            id: "acct_123",
            object: "account",
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true,
            country: "US",
            default_currency: "usd",
            requirements: {
              currently_due: [],
              eventually_due: []
            }
          } as unknown as Stripe.Account
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: "account.updated"
      },
      {
        id: "evt_capability",
        object: "event",
        api_version: "2025-09-30.clover",
        created: 1,
        data: {
          object: {
            account: "acct_123",
            status: "active"
          } as unknown as Stripe.Capability
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: "capability.updated"
      },
      {
        id: "evt_capability_object",
        object: "event",
        api_version: "2025-09-30.clover",
        created: 1,
        data: {
          object: {
            account: {
              id: "acct_object"
            },
            status: "inactive"
          } as unknown as Stripe.Capability
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: "capability.updated"
      },
      {
        id: "evt_payout",
        object: "event",
        api_version: "2025-09-30.clover",
        account: "acct_123",
        created: 1,
        data: {
          object: {
            id: "po_123",
            destination: "acct_123",
            failure_code: "code",
            failure_message: "message"
          } as unknown as Stripe.Payout
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: "payout.failed"
      },
      {
        id: "evt_payout_canceled",
        object: "event",
        api_version: "2025-09-30.clover",
        created: 1,
        data: {
          object: {
            id: "po_456",
            destination: "acct_destination",
            failure_code: null,
            failure_message: null
          } as unknown as Stripe.Payout
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: "payout.canceled"
      }
    ];
    let nextEventIndex = 0;
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => Stripe.Event };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () => {
          const nextEvent = events[nextEventIndex];
          if (nextEvent === undefined) {
            throw new Error("No stub Stripe event available.");
          }
          nextEventIndex += 1;
          return nextEvent;
        }
      }
    };

    expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig"
      })
    ).toMatchObject({
      id: "evt_account",
      type: "account.updated",
      account: {
        accountId: "acct_123"
      }
    });
    expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig"
      })
    ).toMatchObject({
      id: "evt_capability",
      type: "capability.updated",
      account: {
        accountId: "acct_123",
        payoutsEnabled: true
      }
    });
    expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig"
      })
    ).toMatchObject({
      id: "evt_capability_object",
      type: "capability.updated",
      account: {
        accountId: "acct_object",
        payoutsEnabled: false
      }
    });
    expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig"
      })
    ).toMatchObject({
      id: "evt_payout",
      type: "payout.failed",
      payoutId: "po_123",
      failureCode: "code"
    });
    const canceledEvent = client.verifyWebhook({
      payload: "{}",
      signature: "sig"
    });
    expect(canceledEvent).toMatchObject({
      id: "evt_payout_canceled",
      type: "payout.canceled",
      payoutId: "po_456",
      accountId: "acct_destination"
    });
  });

  it("maps invalid webhook signatures to the domain error", () => {
    const client = new StripeSdkConnectClient("sk_test_123", "whsec_test_123");
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => never };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () => {
          throw new Error("invalid signature");
        }
      }
    };

    expect(() =>
      client.verifyWebhook({
        payload: "{}",
        signature: "sig"
      })
    ).toThrow(StripeWebhookSignatureVerificationError);
  });

  it("maps payout webhooks with no recoverable account id to an empty account id", () => {
    const client = new StripeSdkConnectClient("sk_test_123", "whsec_test_123");
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => Stripe.Event };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () =>
          ({
            id: "evt_payout_paid",
            object: "event",
            api_version: "2025-09-30.clover",
            created: 1,
            data: {
              object: {
                id: "po_paid",
                destination: {
                  id: "ba_123"
                },
                failure_code: null,
                failure_message: null
              } as unknown as Stripe.Payout
            },
            livemode: false,
            pending_webhooks: 1,
            request: { id: null, idempotency_key: null },
            type: "payout.paid"
          }) as Stripe.Event
      }
    };

    expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig"
      })
    ).toEqual({
      id: "evt_payout_paid",
      type: "payout.paid",
      payoutId: "po_paid",
      accountId: "",
      failureCode: null,
      failureMessage: null
    });
  });
});
