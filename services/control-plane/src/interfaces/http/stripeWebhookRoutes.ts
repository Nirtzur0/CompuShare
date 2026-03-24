import type { FastifyInstance } from "fastify";
import type { ProcessStripeDisputeWebhookUseCase } from "../../application/dispute/ProcessStripeDisputeWebhookUseCase.js";
import type { ProcessStripeConnectWebhookUseCase } from "../../application/payout/ProcessStripeConnectWebhookUseCase.js";
import { StripeWebhookSignatureVerificationError } from "../../application/payout/PayoutErrors.js";

export function registerStripeWebhookRoutes(
  app: FastifyInstance,
  processStripeConnectWebhookUseCase: Pick<
    ProcessStripeConnectWebhookUseCase,
    "execute"
  > | undefined,
  processStripeDisputeWebhookUseCase?: Pick<
    ProcessStripeDisputeWebhookUseCase,
    "execute"
  >
): void {
  if (processStripeConnectWebhookUseCase !== undefined) {
    app.post(
      "/v1/webhooks/stripe/connect",
      {
        config: {
          rawBody: true
        }
      },
      async (request, reply) => {
        const signature = request.headers["stripe-signature"];
        const payload = resolveStripePayload(request);

        if (typeof signature !== "string" || typeof payload !== "string") {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: "Stripe signature and raw body are required."
          });
        }

        try {
          await processStripeConnectWebhookUseCase.execute({
            payload,
            signature
          });

          return await reply.status(202).send({ accepted: true });
        } catch (error) {
          if (error instanceof StripeWebhookSignatureVerificationError) {
            return reply.status(400).send({
              error: "STRIPE_WEBHOOK_SIGNATURE_VERIFICATION_ERROR",
              message: error.message
            });
          }

          throw error;
        }
      }
    );
  }

  if (processStripeDisputeWebhookUseCase !== undefined) {
    app.post(
      "/v1/webhooks/stripe/disputes",
      {
        config: {
          rawBody: true
        }
      },
      async (request, reply) => {
        const signature = request.headers["stripe-signature"];
        const payload = resolveStripePayload(request);

        if (typeof signature !== "string" || typeof payload !== "string") {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: "Stripe signature and raw body are required."
          });
        }

        try {
          await processStripeDisputeWebhookUseCase.execute({
            payload,
            signature
          });

          return await reply.status(202).send({ accepted: true });
        } catch (error) {
          if (error instanceof StripeWebhookSignatureVerificationError) {
            return reply.status(400).send({
              error: "STRIPE_WEBHOOK_SIGNATURE_VERIFICATION_ERROR",
              message: error.message
            });
          }

          throw error;
        }
      }
    );
  }
}

interface FastifyRequestWithRawBody {
  rawBody?: string | Buffer;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

function resolveStripePayload(request: FastifyRequestWithRawBody): string | undefined {
  const rawBody = request.rawBody;
  return typeof rawBody === "string"
    ? rawBody
    : rawBody instanceof Buffer
      ? rawBody.toString("utf8")
    : typeof request.body === "string"
      ? request.body
      : request.body === undefined
        ? undefined
        : JSON.stringify(request.body);
}
