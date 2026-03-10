import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AuthenticateOrganizationApiKeyUseCase } from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type { CreatePrivateConnectorUseCase } from "../../application/privateConnector/CreatePrivateConnectorUseCase.js";
import type { ListPrivateConnectorsUseCase } from "../../application/privateConnector/ListPrivateConnectorsUseCase.js";
import type { RecordPrivateConnectorCheckInUseCase } from "../../application/privateConnector/RecordPrivateConnectorCheckInUseCase.js";
import type { AdmitPrivateConnectorExecutionGrantUseCase } from "../../application/privateConnector/AdmitPrivateConnectorExecutionGrantUseCase.js";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError
} from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import {
  PrivateConnectorAuthorizationError,
  PrivateConnectorBuyerCapabilityRequiredError,
  PrivateConnectorOrganizationNotFoundError
} from "../../application/privateConnector/CreatePrivateConnectorUseCase.js";
import {
  PrivateConnectorEnvironmentMismatchError,
  PrivateConnectorNotFoundError
} from "../../application/privateConnector/RecordPrivateConnectorCheckInUseCase.js";
import {
  PrivateConnectorExecutionGrantRejectedError
} from "../../application/privateConnector/AdmitPrivateConnectorExecutionGrantUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const paramsSchema = z.object({
  organizationId: z.uuid()
});

const listQuerySchema = z.object({
  actorUserId: z.uuid(),
  environment: z.enum(["development", "staging", "production"]).optional()
});

const createRequestSchema = z.object({
  actorUserId: z.uuid(),
  environment: z.enum(["development", "staging", "production"]),
  label: z.string().min(3).max(120),
  mode: z.enum(["cluster", "byok_api"]),
  endpointUrl: z.url(),
  modelMappings: z
    .array(
      z.object({
        requestModelAlias: z.string().min(3).max(120),
        upstreamModelId: z.string().min(3).max(160)
      })
    )
    .min(1)
    .max(64)
});

const connectorParamsSchema = z.object({
  organizationId: z.uuid(),
  environment: z.enum(["development", "staging", "production"]),
  connectorId: z.uuid()
});

const connectorCheckInRequestSchema = z.object({
  runtimeVersion: z.string().min(1).max(120).nullable()
});

const runtimeAdmissionRequestSchema = z.object({
  signedGrant: z.object({
    grant: z.object({
      grantId: z.uuid(),
      organizationId: z.uuid(),
      connectorId: z.uuid(),
      environment: z.enum(["development", "staging", "production"]),
      requestKind: z.literal("chat.completions"),
      requestModelAlias: z.string().min(3).max(160),
      upstreamModelId: z.string().min(3).max(160),
      maxTokens: z.int().min(1).max(131_072),
      issuedAt: z.iso.datetime(),
      expiresAt: z.iso.datetime()
    }),
    signature: z.string().min(64).max(64),
    signatureKeyId: z.string().min(3).max(120)
  })
});

export function registerPrivateConnectorRoutes(
  app: FastifyInstance,
  authenticateOrganizationApiKeyUseCase: Pick<
    AuthenticateOrganizationApiKeyUseCase,
    "execute"
  >,
  createPrivateConnectorUseCase: Pick<CreatePrivateConnectorUseCase, "execute">,
  listPrivateConnectorsUseCase: Pick<ListPrivateConnectorsUseCase, "execute">,
  recordPrivateConnectorCheckInUseCase: Pick<
    RecordPrivateConnectorCheckInUseCase,
    "execute"
  >,
  admitPrivateConnectorExecutionGrantUseCase: Pick<
    AdmitPrivateConnectorExecutionGrantUseCase,
    "execute"
  >
): void {
  app.post("/v1/organizations/:organizationId/private-connectors", async (request, reply) => {
    const parsedParams = paramsSchema.safeParse(request.params);
    const parsedBody = createRequestSchema.safeParse(request.body);

    if (!parsedParams.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedParams.error.issues[0]?.message ?? "Invalid request."
      });
    }

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedBody.error.issues[0]?.message ?? "Invalid request."
      });
    }

    try {
      const response = await createPrivateConnectorUseCase.execute({
        organizationId: parsedParams.data.organizationId,
        actorUserId: parsedBody.data.actorUserId,
        environment: parsedBody.data.environment,
        label: parsedBody.data.label,
        mode: parsedBody.data.mode,
        endpointUrl: parsedBody.data.endpointUrl,
        modelMappings: parsedBody.data.modelMappings
      });

      return await reply.status(201).send(response);
    } catch (error) {
      if (error instanceof PrivateConnectorOrganizationNotFoundError) {
        return reply.status(404).send({
          error: "PRIVATE_CONNECTOR_ORGANIZATION_NOT_FOUND",
          message: error.message
        });
      }

      if (error instanceof PrivateConnectorBuyerCapabilityRequiredError) {
        return reply.status(403).send({
          error: "PRIVATE_CONNECTOR_BUYER_CAPABILITY_REQUIRED",
          message: error.message
        });
      }

      if (error instanceof PrivateConnectorAuthorizationError) {
        return reply.status(403).send({
          error: "PRIVATE_CONNECTOR_AUTHORIZATION_ERROR",
          message: error.message
        });
      }

      if (error instanceof DomainValidationError) {
        return reply.status(400).send({
          error: "DOMAIN_VALIDATION_ERROR",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.get("/v1/organizations/:organizationId/private-connectors", async (request, reply) => {
    const parsedParams = paramsSchema.safeParse(request.params);
    const parsedQuery = listQuerySchema.safeParse(request.query);

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
      const response = await listPrivateConnectorsUseCase.execute({
        organizationId: parsedParams.data.organizationId,
        actorUserId: parsedQuery.data.actorUserId,
        ...(parsedQuery.data.environment === undefined
          ? {}
          : { environment: parsedQuery.data.environment })
      });

      return await reply.status(200).send(response);
    } catch (error) {
      if (error instanceof PrivateConnectorOrganizationNotFoundError) {
        return reply.status(404).send({
          error: "PRIVATE_CONNECTOR_ORGANIZATION_NOT_FOUND",
          message: error.message
        });
      }

      if (error instanceof PrivateConnectorBuyerCapabilityRequiredError) {
        return reply.status(403).send({
          error: "PRIVATE_CONNECTOR_BUYER_CAPABILITY_REQUIRED",
          message: error.message
        });
      }

      if (error instanceof PrivateConnectorAuthorizationError) {
        return reply.status(403).send({
          error: "PRIVATE_CONNECTOR_AUTHORIZATION_ERROR",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/private-connectors/:connectorId/check-ins",
    async (request, reply) => {
      const parsedParams = connectorParamsSchema.safeParse(request.params);
      const parsedBody = connectorCheckInRequestSchema.safeParse(request.body);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (typeof apiKeyHeader !== "string" || apiKeyHeader.trim().length === 0) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        const authentication =
          await authenticateOrganizationApiKeyUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            environment: parsedParams.data.environment,
            secret: apiKeyHeader
          });
        const response = await recordPrivateConnectorCheckInUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          connectorId: parsedParams.data.connectorId,
          environment: parsedParams.data.environment,
          runtimeVersion: parsedBody.data.runtimeVersion,
          actorUserId: authentication.apiKey.issuedByUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof PrivateConnectorNotFoundError) {
          return reply.status(404).send({
            error: "PRIVATE_CONNECTOR_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof PrivateConnectorEnvironmentMismatchError) {
          return reply.status(409).send({
            error: "PRIVATE_CONNECTOR_ENVIRONMENT_MISMATCH",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/private-connectors/:connectorId/runtime-admissions",
    async (request, reply) => {
      const parsedParams = connectorParamsSchema.safeParse(request.params);
      const parsedBody = runtimeAdmissionRequestSchema.safeParse(request.body);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (typeof apiKeyHeader !== "string" || apiKeyHeader.trim().length === 0) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        const authentication =
          await authenticateOrganizationApiKeyUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            environment: parsedParams.data.environment,
            secret: apiKeyHeader
          });
        const response = await admitPrivateConnectorExecutionGrantUseCase.execute({
          actorUserId: authentication.apiKey.issuedByUserId,
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          connectorId: parsedParams.data.connectorId,
          signedGrant: parsedBody.data.signedGrant
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof PrivateConnectorNotFoundError) {
          return reply.status(404).send({
            error: "PRIVATE_CONNECTOR_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof PrivateConnectorEnvironmentMismatchError) {
          return reply.status(409).send({
            error: "PRIVATE_CONNECTOR_ENVIRONMENT_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof PrivateConnectorExecutionGrantRejectedError) {
          return reply.status(403).send({
            error: "PRIVATE_CONNECTOR_RUNTIME_ADMISSION_REJECTED",
            message: error.message
          });
        }

        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
