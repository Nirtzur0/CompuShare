import type { FastifyInstance } from "fastify";
import type { ProcessStripeConnectWebhookUseCase } from "../../application/payout/ProcessStripeConnectWebhookUseCase.js";
import { StripeWebhookSignatureVerificationError } from "../../application/payout/PayoutErrors.js";

export function registerStripeWebhookRoutes(
  app: FastifyInstance,
  processStripeConnectWebhookUseCase: Pick<
    ProcessStripeConnectWebhookUseCase,
    "execute"
  >
): void {
  app.post(
    "/v1/webhooks/stripe/connect",
    {
      config: {
        rawBody: true
      }
    },
    async (request, reply) => {
      const signature = request.headers["stripe-signature"];
      const rawBody = (request as FastifyRequestWithRawBody).rawBody;
      const payload =
        typeof rawBody === "string"
          ? rawBody
          : typeof request.body === "string"
            ? request.body
            : request.body === undefined
              ? undefined
              : JSON.stringify(request.body);

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

interface FastifyRequestWithRawBody {
  rawBody?: string;
}
