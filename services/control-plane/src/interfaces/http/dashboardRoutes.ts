import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GetComplianceOverviewUseCase } from "../../application/dashboard/GetComplianceOverviewUseCase.js";
import type { GetConsumerDisputeDashboardUseCase } from "../../application/dashboard/GetConsumerDisputeDashboardUseCase.js";
import type { GetConsumerDashboardOverviewUseCase } from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import type { GetPrivateConnectorDashboardUseCase } from "../../application/dashboard/GetPrivateConnectorDashboardUseCase.js";
import type { GetProviderDisputeDashboardUseCase } from "../../application/dashboard/GetProviderDisputeDashboardUseCase.js";
import type { GetProviderPricingSimulatorUseCase } from "../../application/dashboard/GetProviderPricingSimulatorUseCase.js";
import {
  ComplianceOverviewAuthorizationError,
  ComplianceOverviewCapabilityRequiredError,
  ComplianceOverviewOrganizationNotFoundError
} from "../../application/dashboard/GetComplianceOverviewUseCase.js";
import {
  ConsumerDisputeDashboardAuthorizationError,
  ConsumerDisputeDashboardCapabilityRequiredError,
  ConsumerDisputeDashboardOrganizationNotFoundError
} from "../../application/dashboard/GetConsumerDisputeDashboardUseCase.js";
import {
  ConsumerDashboardAuthorizationError,
  ConsumerDashboardCapabilityRequiredError,
  ConsumerDashboardOrganizationNotFoundError
} from "../../application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import type { GetProviderDashboardOverviewUseCase } from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import {
  PrivateConnectorDashboardAuthorizationError,
  PrivateConnectorDashboardCapabilityRequiredError,
  PrivateConnectorDashboardOrganizationNotFoundError
} from "../../application/dashboard/GetPrivateConnectorDashboardUseCase.js";
import {
  ProviderDisputeDashboardAuthorizationError,
  ProviderDisputeDashboardCapabilityRequiredError,
  ProviderDisputeDashboardOrganizationNotFoundError
} from "../../application/dashboard/GetProviderDisputeDashboardUseCase.js";
import {
  ProviderDashboardAuthorizationError,
  ProviderDashboardCapabilityRequiredError,
  ProviderDashboardOrganizationNotFoundError
} from "../../application/dashboard/GetProviderDashboardOverviewUseCase.js";
import {
  ProviderPricingSimulatorAuthorizationError,
  ProviderPricingSimulatorCapabilityRequiredError,
  ProviderPricingSimulatorOrganizationNotFoundError
} from "../../application/dashboard/GetProviderPricingSimulatorUseCase.js";

const providerDashboardParamsSchema = z.object({
  organizationId: z.uuid()
});

const providerDashboardQuerySchema = z.object({
  actorUserId: z.uuid()
});

const consumerDashboardQuerySchema = z.object({
  actorUserId: z.uuid()
});

const consumerOverviewQuerySchema = z.object({
  actorUserId: z.uuid(),
  environment: z.enum(["development", "staging", "production"])
});

const complianceOverviewQuerySchema = z.object({
  actorUserId: z.uuid(),
  environment: z.enum(["development", "staging", "production"])
});

export function registerDashboardRoutes(
  app: FastifyInstance,
  getComplianceOverviewUseCase: Pick<
    GetComplianceOverviewUseCase,
    "execute"
  > | undefined,
  getConsumerDisputeDashboardUseCase: Pick<
    GetConsumerDisputeDashboardUseCase,
    "execute"
  > | undefined,
  getConsumerDashboardOverviewUseCase: Pick<
    GetConsumerDashboardOverviewUseCase,
    "execute"
  >,
  getProviderDashboardOverviewUseCase: Pick<
    GetProviderDashboardOverviewUseCase,
    "execute"
  >,
  getProviderDisputeDashboardUseCase?: Pick<
    GetProviderDisputeDashboardUseCase,
    "execute"
  >,
  getPrivateConnectorDashboardUseCase?: Pick<
    GetPrivateConnectorDashboardUseCase,
    "execute"
  >,
  getProviderPricingSimulatorUseCase?: Pick<
    GetProviderPricingSimulatorUseCase,
    "execute"
  >
): void {
  if (getComplianceOverviewUseCase !== undefined) {
    app.get(
      "/v1/organizations/:organizationId/dashboard/compliance-overview",
      async (request, reply) => {
        const parsedParams = providerDashboardParamsSchema.safeParse(
          request.params
        );
        const parsedQuery = complianceOverviewQuerySchema.safeParse(request.query);

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
          const response = await getComplianceOverviewUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            actorUserId: parsedQuery.data.actorUserId,
            environment: parsedQuery.data.environment
          });

          return await reply.status(200).send(response);
        } catch (error) {
          if (error instanceof ComplianceOverviewOrganizationNotFoundError) {
            return reply.status(404).send({
              error: "COMPLIANCE_OVERVIEW_ORGANIZATION_NOT_FOUND",
              message: error.message
            });
          }

          if (error instanceof ComplianceOverviewCapabilityRequiredError) {
            return reply.status(403).send({
              error: "COMPLIANCE_OVERVIEW_CAPABILITY_REQUIRED",
              message: error.message
            });
          }

          if (error instanceof ComplianceOverviewAuthorizationError) {
            return reply.status(403).send({
              error: "COMPLIANCE_OVERVIEW_AUTHORIZATION_ERROR",
              message: error.message
            });
          }

          throw error;
        }
      }
    );
  }

  app.get(
    "/v1/organizations/:organizationId/dashboard/consumer-disputes",
    async (request, reply) => {
      const parsedParams = providerDashboardParamsSchema.safeParse(
        request.params
      );
      const parsedQuery = consumerDashboardQuerySchema.safeParse(request.query);

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

      if (getConsumerDisputeDashboardUseCase === undefined) {
        return reply.status(404).send({
          error: "CONSUMER_DISPUTE_DASHBOARD_UNAVAILABLE",
          message: "Consumer dispute dashboard is not configured."
        });
      }

      try {
        const response = await getConsumerDisputeDashboardUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof ConsumerDisputeDashboardOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "CONSUMER_DISPUTE_DASHBOARD_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ConsumerDisputeDashboardCapabilityRequiredError) {
          return reply.status(403).send({
            error: "CONSUMER_DISPUTE_DASHBOARD_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ConsumerDisputeDashboardAuthorizationError) {
          return reply.status(403).send({
            error: "CONSUMER_DISPUTE_DASHBOARD_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/dashboard/consumer-overview",
    async (request, reply) => {
      const parsedParams = providerDashboardParamsSchema.safeParse(
        request.params
      );
      const parsedQuery = consumerOverviewQuerySchema.safeParse(request.query);

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
          actorUserId: parsedQuery.data.actorUserId,
          environment: parsedQuery.data.environment
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
    "/v1/organizations/:organizationId/dashboard/private-connectors",
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

      if (getPrivateConnectorDashboardUseCase === undefined) {
        return reply.status(404).send({
          error: "PRIVATE_CONNECTOR_DASHBOARD_UNAVAILABLE",
          message: "Private connector dashboard is not configured."
        });
      }

      try {
        const response = await getPrivateConnectorDashboardUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof PrivateConnectorDashboardOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PRIVATE_CONNECTOR_DASHBOARD_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof PrivateConnectorDashboardCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PRIVATE_CONNECTOR_DASHBOARD_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof PrivateConnectorDashboardAuthorizationError) {
          return reply.status(403).send({
            error: "PRIVATE_CONNECTOR_DASHBOARD_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/dashboard/provider-disputes",
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

      if (getProviderDisputeDashboardUseCase === undefined) {
        return reply.status(404).send({
          error: "PROVIDER_DISPUTE_DASHBOARD_UNAVAILABLE",
          message: "Provider dispute dashboard is not configured."
        });
      }

      try {
        const response = await getProviderDisputeDashboardUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof ProviderDisputeDashboardOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_DISPUTE_DASHBOARD_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderDisputeDashboardCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_DISPUTE_DASHBOARD_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderDisputeDashboardAuthorizationError) {
          return reply.status(403).send({
            error: "PROVIDER_DISPUTE_DASHBOARD_AUTHORIZATION_ERROR",
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

  if (getProviderPricingSimulatorUseCase === undefined) {
    return;
  }

  app.get(
    "/v1/organizations/:organizationId/dashboard/provider-pricing-simulator",
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
        const response = await getProviderPricingSimulatorUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (
          error instanceof ProviderPricingSimulatorOrganizationNotFoundError
        ) {
          return reply.status(404).send({
            error: "PROVIDER_PRICING_SIMULATOR_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderPricingSimulatorCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_PRICING_SIMULATOR_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderPricingSimulatorAuthorizationError) {
          return reply.status(403).send({
            error: "PROVIDER_PRICING_SIMULATOR_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
