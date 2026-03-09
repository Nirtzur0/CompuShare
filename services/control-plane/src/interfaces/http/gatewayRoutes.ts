import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ApprovedChatModelNotFoundError,
  GatewayAuthorizationHeaderError
} from "../../application/gateway/ExecuteChatCompletionUseCase.js";
import type { ExecuteChatCompletionUseCase } from "../../application/gateway/ExecuteChatCompletionUseCase.js";
import {
  GatewayUpstreamRequestError,
  GatewayUpstreamResponseError
} from "../../application/gateway/ports/GatewayUpstreamClient.js";
import { GatewayApiKeyAuthenticationError } from "../../application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";
import { WorkloadBundleAdmissionRejectedError } from "../../application/workload/WorkloadBundleAdmissionRejectedError.js";
import {
  NoEligiblePlacementCandidateError,
  SyncPlacementBuyerCapabilityRequiredError,
  SyncPlacementOrganizationNotFoundError
} from "../../application/placement/ResolveSyncPlacementUseCase.js";

const chatCompletionRequestSchema = z.looseObject({
  model: z.string().min(3).max(120),
  messages: z
    .array(
      z.looseObject({
        role: z.enum(["system", "developer", "user", "assistant"]),
        content: z.string().min(1).max(200_000)
      })
    )
    .min(1),
  stream: z.literal(false).optional(),
  max_tokens: z.number().int().positive().max(131_072).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().positive().max(1).optional()
});

export function registerGatewayRoutes(
  app: FastifyInstance,
  executeChatCompletionUseCase: ExecuteChatCompletionUseCase
): void {
  app.post("/v1/chat/completions", async (request, reply) => {
    const parsedBody = chatCompletionRequestSchema.safeParse(request.body);
    const authorizationHeader = request.headers.authorization;

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedBody.error.issues[0]?.message ?? "Invalid request."
      });
    }

    if (typeof authorizationHeader !== "string") {
      return reply.status(401).send({
        error: "GATEWAY_AUTHORIZATION_MISSING",
        message: "An Authorization: Bearer <org_api_key> header is required."
      });
    }

    try {
      const response = await executeChatCompletionUseCase.execute({
        authorizationHeader,
        request: parsedBody.data
      });

      return await reply.status(200).send(response);
    } catch (error) {
      if (error instanceof GatewayAuthorizationHeaderError) {
        return reply.status(401).send({
          error: "GATEWAY_AUTHORIZATION_INVALID",
          message: error.message
        });
      }

      if (error instanceof DomainValidationError) {
        return reply.status(400).send({
          error: "DOMAIN_VALIDATION_ERROR",
          message: error.message
        });
      }

      if (error instanceof GatewayApiKeyAuthenticationError) {
        return reply.status(401).send({
          error: "GATEWAY_API_KEY_AUTHENTICATION_ERROR",
          message: error.message
        });
      }

      if (error instanceof ApprovedChatModelNotFoundError) {
        return reply.status(404).send({
          error: "APPROVED_CHAT_MODEL_NOT_FOUND",
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

      if (error instanceof WorkloadBundleAdmissionRejectedError) {
        return reply.status(503).send({
          error: "WORKLOAD_BUNDLE_ADMISSION_REJECTED",
          message: error.message
        });
      }

      if (error instanceof GatewayUpstreamRequestError) {
        return reply.status(502).send({
          error: "GATEWAY_UPSTREAM_REQUEST_ERROR",
          message: error.message
        });
      }

      if (error instanceof GatewayUpstreamResponseError) {
        return reply.status(502).send({
          error: "GATEWAY_UPSTREAM_RESPONSE_ERROR",
          message: error.message
        });
      }

      throw error;
    }
  });
}
