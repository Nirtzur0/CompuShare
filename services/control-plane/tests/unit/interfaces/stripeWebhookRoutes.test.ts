import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import { describe, expect, it } from "vitest";
import { StripeWebhookSignatureVerificationError } from "../../../src/application/payout/PayoutErrors.js";
import { registerStripeWebhookRoutes } from "../../../src/interfaces/http/stripeWebhookRoutes.js";

describe("stripe webhook routes", () => {
  it("accepts dispute webhooks when the use case succeeds", async () => {
    const app = Fastify();
    await app.register(fastifyRawBody, {
      field: "rawBody",
      global: true,
      encoding: "utf8",
      runFirst: true,
    });
    registerStripeWebhookRoutes(
      app,
      undefined,
      {
        execute: () => Promise.resolve({ accepted: true }),
      },
    );

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/disputes",
      headers: {
        "stripe-signature": "sig_123",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ id: "evt_001" }),
    });

    expect(response.statusCode).toBe(202);
    await app.close();
  });

  it("returns 400 when the dispute webhook signature is missing", async () => {
    const app = Fastify();
    await app.register(fastifyRawBody, {
      field: "rawBody",
      global: true,
      encoding: "utf8",
      runFirst: true,
    });
    registerStripeWebhookRoutes(
      app,
      undefined,
      {
        execute: () => Promise.resolve({ accepted: true }),
      },
    );

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/disputes",
      headers: {
        "content-type": "application/json",
      },
      payload: JSON.stringify({ id: "evt_001" }),
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("maps signature verification failures for dispute webhooks", async () => {
    const app = Fastify();
    await app.register(fastifyRawBody, {
      field: "rawBody",
      global: true,
      encoding: "utf8",
      runFirst: true,
    });
    registerStripeWebhookRoutes(
      app,
      undefined,
      {
        execute: () =>
          Promise.reject(new StripeWebhookSignatureVerificationError()),
      },
    );

    const response = await app.inject({
      method: "POST",
      url: "/v1/webhooks/stripe/disputes",
      headers: {
        "stripe-signature": "sig_123",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ id: "evt_001" }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "STRIPE_WEBHOOK_SIGNATURE_VERIFICATION_ERROR",
      message: "The Stripe webhook signature is invalid.",
    });
    await app.close();
  });
});
