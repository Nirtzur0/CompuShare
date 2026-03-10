import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError,
  type AuthenticateOrganizationApiKeyUseCase
} from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import {
  PlacementBuyerCapabilityRequiredError,
  PlacementOrganizationNotFoundError
} from "../../application/placement/ListPlacementCandidatesUseCase.js";
import type { ListPlacementCandidatesUseCase } from "../../application/placement/ListPlacementCandidatesUseCase.js";
import {
  NoEligiblePlacementCandidateError,
  SyncPlacementBuyerCapabilityRequiredError,
  SyncPlacementOrganizationNotFoundError
} from "../../application/placement/ResolveSyncPlacementUseCase.js";
import type { ResolveSyncPlacementUseCase } from "../../application/placement/ResolveSyncPlacementUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const placementCandidateRequestSchema = z.object({
  gpuClass: z.string().min(2).max(120),
  minVramGb: z.int().min(1).max(4096),
  region: z.string().min(2).max(64),
  minimumTrustTier: z.enum(["t0_community", "t1_vetted", "t2_attested"]),
  maxPriceUsdPerHour: z.number().positive().max(1_000_000),
  approvedModelAlias: z.string().min(3).max(120).optional()
});

export function registerPlacementRoutes(
  app: FastifyInstance,
  authenticateOrganizationApiKeyUseCase: Pick<
    AuthenticateOrganizationApiKeyUseCase,
    "execute"
  >,
  listPlacementCandidatesUseCase: Pick<
    ListPlacementCandidatesUseCase,
    "execute"
  >,
  resolveSyncPlacementUseCase: Pick<ResolveSyncPlacementUseCase, "execute">
): void {
  app.post(
    "/v1/organizations/:organizationId/environments/:environment/placement-candidates/preview",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"])
        })
        .safeParse(request.params);
      const parsedBody = placementCandidateRequestSchema.safeParse(
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

        const response = await listPlacementCandidatesUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          gpuClass: parsedBody.data.gpuClass,
          minVramGb: parsedBody.data.minVramGb,
          region: parsedBody.data.region,
          minimumTrustTier: parsedBody.data.minimumTrustTier,
          maxPriceUsdPerHour: parsedBody.data.maxPriceUsdPerHour,
          ...(parsedBody.data.approvedModelAlias === undefined
            ? {}
            : { approvedModelAlias: parsedBody.data.approvedModelAlias })
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

        if (error instanceof PlacementOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PLACEMENT_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof PlacementBuyerCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PLACEMENT_BUYER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/placements/sync",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"])
        })
        .safeParse(request.params);
      const parsedBody = placementCandidateRequestSchema.safeParse(
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

        const response = await resolveSyncPlacementUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          gpuClass: parsedBody.data.gpuClass,
          minVramGb: parsedBody.data.minVramGb,
          region: parsedBody.data.region,
          minimumTrustTier: parsedBody.data.minimumTrustTier,
          maxPriceUsdPerHour: parsedBody.data.maxPriceUsdPerHour,
          ...(parsedBody.data.approvedModelAlias === undefined
            ? {}
            : { approvedModelAlias: parsedBody.data.approvedModelAlias })
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

        if (error instanceof SyncPlacementOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "SYNC_PLACEMENT_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof SyncPlacementBuyerCapabilityRequiredError) {
          return reply.status(403).send({
            error: "SYNC_PLACEMENT_BUYER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof NoEligiblePlacementCandidateError) {
          return reply.status(404).send({
            error: "NO_ELIGIBLE_PLACEMENT_CANDIDATE",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
