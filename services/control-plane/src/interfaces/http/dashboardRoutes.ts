import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GetConsumerDashboardOverviewUseCase } from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import {
  ConsumerDashboardAuthorizationError,
  ConsumerDashboardCapabilityRequiredError,
  ConsumerDashboardOrganizationNotFoundError
} from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import type { GetProviderDashboardOverviewUseCase } from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import {
  ProviderDashboardAuthorizationError,
  ProviderDashboardCapabilityRequiredError,
  ProviderDashboardOrganizationNotFoundError
} from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";

const providerDashboardParamsSchema = z.object({
  organizationId: z.uuid()
});

const providerDashboardQuerySchema = z.object({
  actorUserId: z.uuid()
});

export function registerDashboardRoutes(
  app: FastifyInstance,
  getConsumerDashboardOverviewUseCase: Pick<
    GetConsumerDashboardOverviewUseCase,
    "execute"
  >,
  getProviderDashboardOverviewUseCase: Pick<
    GetProviderDashboardOverviewUseCase,
    "execute"
  >
): void {
  app.get(
    "/v1/organizations/:organizationId/dashboard/consumer-overview",
    async (request, reply) => {
      const parsedParams = providerDashboardParamsSchema.safeParse(
        request.params
      );
      const parsedQuery = providerDashboardQuerySchema.safeParse(request.query);

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
        const response = await getConsumerDashboardOverviewUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof ConsumerDashboardOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "CONSUMER_DASHBOARD_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ConsumerDashboardCapabilityRequiredError) {
          return reply.status(403).send({
            error: "CONSUMER_DASHBOARD_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ConsumerDashboardAuthorizationError) {
          return reply.status(403).send({
            error: "CONSUMER_DASHBOARD_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/dashboard/provider-overview",
    async (request, reply) => {
      const parsedParams = providerDashboardParamsSchema.safeParse(
        request.params
      );
      const parsedQuery = providerDashboardQuerySchema.safeParse(request.query);

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
        const response = await getProviderDashboardOverviewUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof ProviderDashboardOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_DASHBOARD_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderDashboardCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_DASHBOARD_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderDashboardAuthorizationError) {
          return reply.status(403).send({
            error: "PROVIDER_DASHBOARD_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
