import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GetFraudReviewAlertsUseCase } from "../../application/fraud/GetFraudReviewAlertsUseCase.js";
import {
  FraudReviewAuthorizationError,
  FraudReviewOrganizationNotFoundError
} from "../../application/fraud/GetFraudReviewAlertsUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const riskRouteParamsSchema = z.object({
  organizationId: z.uuid()
});

const fraudReviewAlertsQuerySchema = z.object({
  actorUserId: z.uuid(),
  lookbackDays: z.coerce.number().int().min(7).max(90).optional()
});

export function registerRiskRoutes(
  app: FastifyInstance,
  getFraudReviewAlertsUseCase: Pick<GetFraudReviewAlertsUseCase, "execute">
): void {
  app.get(
    "/v1/organizations/:organizationId/risk/fraud-review-alerts",
    async (request, reply) => {
      const parsedParams = riskRouteParamsSchema.safeParse(request.params);
      const parsedQuery = fraudReviewAlertsQuerySchema.safeParse(request.query);

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedQuery.error.issues[0]?.message ?? "Invalid request."
        });
      }

      try {
        const response = await getFraudReviewAlertsUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId,
          ...(parsedQuery.data.lookbackDays === undefined
            ? {}
            : { lookbackDays: parsedQuery.data.lookbackDays })
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof FraudReviewOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "FRAUD_REVIEW_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof FraudReviewAuthorizationError) {
          return reply.status(403).send({
            error: "FRAUD_REVIEW_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
