import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError,
  type AuthenticateOrganizationApiKeyUseCase
} from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import {
  OrganizationInvitationExpiredError,
  OrganizationInvitationNotFoundError,
  OrganizationMembershipConflictError
} from "../../application/identity/AcceptOrganizationInvitationUseCase.js";
import type { AcceptOrganizationInvitationUseCase } from "../../application/identity/AcceptOrganizationInvitationUseCase.js";
import {
  OrganizationInvitationAuthorizationError,
  PendingOrganizationInvitationConflictError
} from "../../application/identity/IssueOrganizationInvitationUseCase.js";
import type { IssueOrganizationInvitationUseCase } from "../../application/identity/IssueOrganizationInvitationUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const issueOrganizationInvitationRequestSchema = z.object({
  inviterUserId: z.uuid(),
  inviteeEmail: z.email(),
  role: z.enum(["owner", "admin", "developer", "finance"])
});

const acceptOrganizationInvitationRequestSchema = z.object({
  inviteeDisplayName: z.string().min(2).max(120)
});

export function registerInvitationRoutes(
  app: FastifyInstance,
  issueOrganizationInvitationUseCase: Pick<
    IssueOrganizationInvitationUseCase,
    "execute"
  >,
  acceptOrganizationInvitationUseCase: Pick<
    AcceptOrganizationInvitationUseCase,
    "execute"
  >,
  authenticateOrganizationApiKeyUseCase: Pick<
    AuthenticateOrganizationApiKeyUseCase,
    "execute"
  >
): void {
  app.post(
    "/v1/organizations/:organizationId/invitations",
    async (request, reply) => {
      const parsedParams = z
        .object({ organizationId: z.uuid() })
        .safeParse(request.params);
      const parsedBody = issueOrganizationInvitationRequestSchema.safeParse(
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
        const response = await issueOrganizationInvitationUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          inviterUserId: parsedBody.data.inviterUserId,
          inviteeEmail: parsedBody.data.inviteeEmail,
          role: parsedBody.data.role
        });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationInvitationAuthorizationError) {
          return reply.status(403).send({
            error: "INVITATION_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof PendingOrganizationInvitationConflictError) {
          return reply.status(409).send({
            error: "PENDING_INVITATION_CONFLICT",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/invitations",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"])
        })
        .safeParse(request.params);
      const parsedBody = issueOrganizationInvitationRequestSchema.safeParse(
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

        const response = await issueOrganizationInvitationUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          inviterUserId: parsedBody.data.inviterUserId,
          inviteeEmail: parsedBody.data.inviteeEmail,
          role: parsedBody.data.role
        });

        return await reply.status(201).send(response);
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

        if (error instanceof OrganizationInvitationAuthorizationError) {
          return reply.status(403).send({
            error: "INVITATION_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof PendingOrganizationInvitationConflictError) {
          return reply.status(409).send({
            error: "PENDING_INVITATION_CONFLICT",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/invitations/:invitationToken/accept",
    async (request, reply) => {
      const parsedParams = z
        .object({
          invitationToken: z.string().min(16).max(256)
        })
        .safeParse(request.params);
      const parsedBody = acceptOrganizationInvitationRequestSchema.safeParse(
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
        const response = await acceptOrganizationInvitationUseCase.execute({
          invitationToken: parsedParams.data.invitationToken,
          inviteeDisplayName: parsedBody.data.inviteeDisplayName
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationInvitationNotFoundError) {
          return reply.status(404).send({
            error: "INVITATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof OrganizationInvitationExpiredError) {
          return reply.status(410).send({
            error: "INVITATION_EXPIRED",
            message: error.message
          });
        }

        if (error instanceof OrganizationMembershipConflictError) {
          return reply.status(409).send({
            error: "ORGANIZATION_MEMBERSHIP_CONFLICT",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
