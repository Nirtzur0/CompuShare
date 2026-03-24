import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { StripeWebhookSignatureVerificationError } from "../../../src/application/payout/PayoutErrors.js";
import { StripeSdkDisputeClient } from "../../../src/infrastructure/payments/StripeDisputeClient.js";

describe("StripeSdkDisputeClient", () => {
  it("returns unsupported for non-dispute Stripe events", async () => {
    const client = new StripeSdkDisputeClient("sk_test_123", "whsec_test_123");
    (
      client as unknown as {
        stripe: { webhooks: { constructEvent: () => Stripe.Event } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () =>
          ({
            id: "evt_unsupported",
            type: "payment_intent.succeeded",
          }) as unknown as Stripe.Event,
      },
    };

    await expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig_123",
      }),
    ).resolves.toEqual({
      id: "evt_unsupported",
      type: "unsupported",
    });
  });

  it("verifies dispute events, trims payment references, and maps open statuses", async () => {
    const client = new StripeSdkDisputeClient("sk_test_123", "whsec_test_123");
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => Stripe.Event };
          charges: { retrieve: (chargeId: string) => Promise<Stripe.Charge> };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () =>
          ({
            id: "evt_open",
            type: "charge.dispute.created",
            data: {
              object: {
                id: "dp_001",
                amount: 650,
                charge: "ch_001",
                reason: "fraudulent",
                status: "needs_response",
              },
            },
          }) as unknown as Stripe.Event,
      },
      charges: {
        retrieve: () =>
          Promise.resolve({
            metadata: {
              paymentReference: " stripe_pi_001 ",
            },
          } as unknown as Stripe.Charge),
      },
    };

    await expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig_123",
      }),
    ).resolves.toMatchObject({
      id: "evt_open",
      type: "charge.dispute.created",
      stripeDisputeId: "dp_001",
      stripeChargeId: "ch_001",
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.50",
      nextStatus: "open",
      summary:
        "Stripe dispute charge.dispute.created (needs response) for reason fraudulent.",
    });
  });

  it("maps Stripe warning-needs-response disputes to the open local status", async () => {
    const client = new StripeSdkDisputeClient("sk_test_123", "whsec_test_123");
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => Stripe.Event };
          charges: { retrieve: (chargeId: string) => Promise<Stripe.Charge> };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () =>
          ({
            id: "evt_warning_open",
            type: "charge.dispute.updated",
            data: {
              object: {
                id: "dp_warning_open",
                amount: 650,
                charge: "ch_warning_open",
                reason: "fraudulent",
                status: "warning_needs_response",
              },
            },
          }) as unknown as Stripe.Event,
      },
      charges: {
        retrieve: () =>
          Promise.resolve({
            metadata: {
              paymentReference: "stripe_pi_001",
            },
          } as unknown as Stripe.Charge),
      },
    };

    await expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig_123",
      }),
    ).resolves.toMatchObject({
      id: "evt_warning_open",
      nextStatus: "open",
    });
  });

  it("maps terminal Stripe dispute outcomes and empty payment references", async () => {
    const client = new StripeSdkDisputeClient("sk_test_123", "whsec_test_123");
    const events: Stripe.Event[] = [
      {
        id: "evt_lost",
        type: "charge.dispute.funds_withdrawn",
        data: {
          object: {
            id: "dp_lost",
            amount: 700,
            charge: "ch_lost",
            reason: "fraudulent",
            status: "lost",
          },
        },
      } as unknown as Stripe.Event,
      {
        id: "evt_recovered",
        type: "charge.dispute.funds_reinstated",
        data: {
          object: {
            id: "dp_recovered",
            amount: 700,
            charge: { id: "ch_recovered" },
            reason: "fraudulent",
            status: "won",
          },
        },
      } as unknown as Stripe.Event,
      {
        id: "evt_canceled",
        type: "charge.dispute.closed",
        data: {
          object: {
            id: "dp_canceled",
            amount: 700,
            charge: "ch_canceled",
            reason: null,
            status: "warning_closed",
          },
        },
      } as unknown as Stripe.Event,
    ];
    let nextIndex = 0;
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => Stripe.Event };
          charges: { retrieve: (chargeId: string) => Promise<Stripe.Charge> };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () => {
          const nextEvent = events[nextIndex];
          if (nextEvent === undefined) {
            throw new Error("No stub Stripe event available.");
          }
          nextIndex += 1;
          return nextEvent;
        },
      },
      charges: {
        retrieve: () =>
          Promise.resolve({
            metadata: {
              paymentReference: "   ",
            },
          } as unknown as Stripe.Charge),
      },
    };

    await expect(
      client.verifyWebhook({ payload: "{}", signature: "sig_123" }),
    ).resolves.toMatchObject({
      id: "evt_lost",
      nextStatus: "lost",
      paymentReference: null,
    });
    await expect(
      client.verifyWebhook({ payload: "{}", signature: "sig_123" }),
    ).resolves.toMatchObject({
      id: "evt_recovered",
      stripeChargeId: "ch_recovered",
      nextStatus: "recovered",
      paymentReference: null,
    });
    await expect(
      client.verifyWebhook({ payload: "{}", signature: "sig_123" }),
    ).resolves.toMatchObject({
      id: "evt_canceled",
      reasonCode: "stripe_dispute",
      stripeReason: "stripe_dispute",
      nextStatus: "canceled",
    });
  });

  it("maps Stripe under-review statuses and rejects unsupported dispute statuses", async () => {
    const client = new StripeSdkDisputeClient("sk_test_123", "whsec_test_123");
    const events: Stripe.Event[] = [
      {
        id: "evt_review",
        type: "charge.dispute.updated",
        data: {
          object: {
            id: "dp_review",
            amount: 700,
            charge: "ch_review",
            reason: "fraudulent",
            status: "warning_under_review",
          },
        },
      } as unknown as Stripe.Event,
      {
        id: "evt_invalid",
        type: "charge.dispute.updated",
        data: {
          object: {
            id: "dp_invalid",
            amount: 700,
            charge: "ch_invalid",
            reason: "fraudulent",
            status: "prevented",
          },
        },
      } as unknown as Stripe.Event,
    ];
    let nextIndex = 0;
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => Stripe.Event };
          charges: { retrieve: (chargeId: string) => Promise<Stripe.Charge> };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () => {
          const nextEvent = events[nextIndex];
          if (nextEvent === undefined) {
            throw new Error("No stub Stripe event available.");
          }
          nextIndex += 1;
          return nextEvent;
        },
      },
      charges: {
        retrieve: () =>
          Promise.resolve({
            metadata: {
              paymentReference: "stripe_pi_001",
            },
          } as unknown as Stripe.Charge),
      },
    };

    await expect(
      client.verifyWebhook({ payload: "{}", signature: "sig_123" }),
    ).resolves.toMatchObject({
      id: "evt_review",
      nextStatus: "under_review",
    });
    await expect(
      client.verifyWebhook({ payload: "{}", signature: "sig_123" }),
    ).rejects.toThrowError("Unsupported Stripe dispute status: prevented");
  });

  it("maps updated won/lost statuses and ignores non-string charge metadata payment references", async () => {
    const client = new StripeSdkDisputeClient("sk_test_123", "whsec_test_123");
    const events: Stripe.Event[] = [
      {
        id: "evt_won",
        type: "charge.dispute.updated",
        data: {
          object: {
            id: "dp_won",
            amount: 700,
            charge: "ch_won",
            reason: "fraudulent",
            status: "won",
          },
        },
      } as unknown as Stripe.Event,
      {
        id: "evt_lost_updated",
        type: "charge.dispute.updated",
        data: {
          object: {
            id: "dp_lost_updated",
            amount: 700,
            charge: "ch_lost_updated",
            reason: "fraudulent",
            status: "lost",
          },
        },
      } as unknown as Stripe.Event,
    ];
    let nextIndex = 0;
    (
      client as unknown as {
        stripe: {
          webhooks: { constructEvent: () => Stripe.Event };
          charges: { retrieve: (chargeId: string) => Promise<Stripe.Charge> };
        };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () => {
          const nextEvent = events[nextIndex];
          if (nextEvent === undefined) {
            throw new Error("No stub Stripe event available.");
          }
          nextIndex += 1;
          return nextEvent;
        },
      },
      charges: {
        retrieve: () =>
          Promise.resolve({
            metadata: {
              paymentReference: 42,
            },
          } as unknown as Stripe.Charge),
      },
    };

    await expect(
      client.verifyWebhook({ payload: "{}", signature: "sig_123" }),
    ).resolves.toMatchObject({
      id: "evt_won",
      paymentReference: null,
      nextStatus: "won",
    });
    await expect(
      client.verifyWebhook({ payload: "{}", signature: "sig_123" }),
    ).resolves.toMatchObject({
      id: "evt_lost_updated",
      paymentReference: null,
      nextStatus: "lost",
    });
  });

  it("raises signature verification failures from Stripe", async () => {
    const client = new StripeSdkDisputeClient("sk_test_123", "whsec_test_123");
    (
      client as unknown as {
        stripe: { webhooks: { constructEvent: () => Stripe.Event } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: () => {
          throw new Error("invalid signature");
        },
      },
    };

    await expect(
      client.verifyWebhook({
        payload: "{}",
        signature: "sig_123",
      }),
    ).rejects.toBeInstanceOf(StripeWebhookSignatureVerificationError);
  });
});
