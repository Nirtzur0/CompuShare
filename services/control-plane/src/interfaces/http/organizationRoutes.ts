import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError,
  type AuthenticateOrganizationApiKeyUseCase
} from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { OrganizationSlugConflictError } from "../../application/identity/CreateOrganizationUseCase.js";
import type { CreateOrganizationUseCase } from "../../application/identity/CreateOrganizationUseCase.js";
import {
  OrganizationApiKeyAuthorizationError,
  type IssueOrganizationApiKeyUseCase
} from "../../application/identity/IssueOrganizationApiKeyUseCase.js";
import {
  OrganizationMemberNotFoundError,
  OrganizationMemberRoleAuthorizationError,
  OrganizationOwnerInvariantError
} from "../../application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { UpdateOrganizationMemberRoleUseCase } from "../../application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const createOrganizationRequestSchema = z.object({
  name: z.string().min(3).max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/u),
  founder: z.object({
    email: z.email(),
    displayName: z.string().min(2).max(120)
  }),
  accountCapabilities: z.array(z.enum(["buyer", "provider"])).min(1)
});

const updateOrganizationMemberRoleRequestSchema = z.object({
  actorUserId: z.uuid(),
  role: z.enum(["owner", "admin", "developer", "finance"])
});

const issueOrganizationApiKeyRequestSchema = z.object({
  actorUserId: z.uuid(),
  label: z.string().min(3).max(120),
  environment: z.enum(["development", "staging", "production"])
});

export function registerOrganizationRoutes(
  app: FastifyInstance,
  createOrganizationUseCase: Pick<CreateOrganizationUseCase, "execute">,
  updateOrganizationMemberRoleUseCase: Pick<
    UpdateOrganizationMemberRoleUseCase,
    "execute"
  >,
  issueOrganizationApiKeyUseCase: Pick<
    IssueOrganizationApiKeyUseCase,
    "execute"
  >,
  authenticateOrganizationApiKeyUseCase: Pick<
    AuthenticateOrganizationApiKeyUseCase,
    "execute"
  >
): void {
  app.post("/v1/organizations", async (request, reply) => {
    const parsedBody = createOrganizationRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedBody.error.issues[0]?.message ?? "Invalid request body."
      });
    }

    try {
      const response = await createOrganizationUseCase.execute({
        organizationName: parsedBody.data.name,
        organizationSlug: parsedBody.data.slug,
        founderEmail: parsedBody.data.founder.email,
        founderDisplayName: parsedBody.data.founder.displayName,
        accountCapabilities: parsedBody.data.accountCapabilities
      });

      return await reply.status(201).send(response);
    } catch (error) {
      if (error instanceof DomainValidationError) {
        return reply.status(400).send({
          error: "DOMAIN_VALIDATION_ERROR",
          message: error.message
        });
      }

      if (error instanceof OrganizationSlugConflictError) {
        return reply.status(409).send({
          error: "ORGANIZATION_SLUG_CONFLICT",
          message: error.message
        });
      }

      throw error;
    }
  });

  app.patch(
    "/v1/organizations/:organizationId/members/:memberUserId/role",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          memberUserId: z.uuid()
        })
        .safeParse(request.params);
      const parsedBody = updateOrganizationMemberRoleRequestSchema.safeParse(
        request.body
      );

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
        const response = await updateOrganizationMemberRoleUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedBody.data.actorUserId,
          targetUserId: parsedParams.data.memberUserId,
          nextRole: parsedBody.data.role
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationMemberRoleAuthorizationError) {
          return reply.status(403).send({
            error: "MEMBER_ROLE_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationMemberNotFoundError) {
          return reply.status(404).send({
            error: "ORGANIZATION_MEMBER_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof OrganizationOwnerInvariantError) {
          return reply.status(409).send({
            error: "ORGANIZATION_OWNER_INVARIANT",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.patch(
    "/v1/organizations/:organizationId/environments/:environment/members/:memberUserId/role",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          memberUserId: z.uuid()
        })
        .safeParse(request.params);
      const parsedBody = updateOrganizationMemberRoleRequestSchema.safeParse(
        request.body
      );
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

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await updateOrganizationMemberRoleUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedBody.data.actorUserId,
          targetUserId: parsedParams.data.memberUserId,
          nextRole: parsedBody.data.role
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

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

        if (error instanceof OrganizationMemberRoleAuthorizationError) {
          return reply.status(403).send({
            error: "MEMBER_ROLE_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationMemberNotFoundError) {
          return reply.status(404).send({
            error: "ORGANIZATION_MEMBER_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof OrganizationOwnerInvariantError) {
          return reply.status(409).send({
            error: "ORGANIZATION_OWNER_INVARIANT",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/api-keys",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid()
        })
        .safeParse(request.params);
      const parsedBody = issueOrganizationApiKeyRequestSchema.safeParse(
        request.body
      );

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
        const response = await issueOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedBody.data.actorUserId,
          label: parsedBody.data.label,
          environment: parsedBody.data.environment
        });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyAuthorizationError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/access-check",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid()
        })
        .safeParse(request.params);
      const parsedQuery = z
        .object({
          environment: z.enum(["development", "staging", "production"])
        })
        .safeParse(request.query);
      const apiKeyHeader = request.headers["x-api-key"];

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

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        const response = await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedQuery.data.environment,
          secret: apiKeyHeader
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

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

        throw error;
      }
    }
  );
}
