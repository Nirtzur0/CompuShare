import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CreateGatewayBatchUseCase } from "../../application/batch/CreateGatewayBatchUseCase.js";
import {
  GatewayActiveBatchLimitExceededError,
  GatewayBatchItemLimitExceededError
} from "../../application/batch/CreateGatewayBatchUseCase.js";
import type { GetGatewayBatchUseCase } from "../../application/batch/GetGatewayBatchUseCase.js";
import type { CancelGatewayBatchUseCase } from "../../application/batch/CancelGatewayBatchUseCase.js";
import { GatewayBatchNotFoundError } from "../../application/batch/GetGatewayBatchUseCase.js";
import { GatewayFileNotFoundError } from "../../application/batch/GetGatewayFileUseCase.js";
import { GatewayApiKeyAuthenticationError } from "../../application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const batchCreateRequestSchema = z.object({
  input_file_id: z.uuid(),
  endpoint: z.enum(["/v1/chat/completions", "/v1/embeddings"]),
  completion_window: z.literal("24h")
});

export function registerBatchRoutes(
  app: FastifyInstance,
  createGatewayBatchUseCase: Pick<CreateGatewayBatchUseCase, "execute">,
  getGatewayBatchUseCase: Pick<GetGatewayBatchUseCase, "execute">,
  cancelGatewayBatchUseCase: Pick<CancelGatewayBatchUseCase, "execute">
): void {
  app.post("/v1/batches", async (request, reply) => {
    const parsedBody = batchCreateRequestSchema.safeParse(request.body);
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
      const response = await createGatewayBatchUseCase.execute({
        authorizationHeader,
        inputFileId: parsedBody.data.input_file_id,
        endpoint: parsedBody.data.endpoint,
        completionWindow: parsedBody.data.completion_window
      });

      return await reply.status(200).send(toOpenAiBatch(response.batch));
    } catch (error) {
      if (error instanceof GatewayApiKeyAuthenticationError) {
        return reply.status(401).send({
          error: "GATEWAY_API_KEY_AUTHENTICATION_ERROR",
          message: error.message
        });
      }
      if (error instanceof GatewayFileNotFoundError) {
        return reply.status(404).send({
          error: "GATEWAY_FILE_NOT_FOUND",
          message: error.message
        });
      }
      if (error instanceof DomainValidationError) {
        return reply.status(400).send({
          error: "DOMAIN_VALIDATION_ERROR",
          message: error.message
        });
      }
      if (error instanceof GatewayBatchItemLimitExceededError) {
        return reply.status(400).send({
          error: "GATEWAY_BATCH_ITEM_LIMIT_EXCEEDED",
          message: error.message
        });
      }
      if (error instanceof GatewayActiveBatchLimitExceededError) {
        return reply.status(429).send({
          error: "GATEWAY_ACTIVE_BATCH_LIMIT_EXCEEDED",
          message: error.message
        });
      }
      throw error;
    }
  });

  app.get("/v1/batches/:batchId", async (request, reply) => {
    const parsedParams = z
      .object({ batchId: z.uuid() })
      .safeParse(request.params);
    const authorizationHeader = request.headers.authorization;
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedParams.error.issues[0]?.message ?? "Invalid request."
      });
    }
    if (typeof authorizationHeader !== "string") {
      return reply.status(401).send({
        error: "GATEWAY_AUTHORIZATION_MISSING",
        message: "An Authorization: Bearer <org_api_key> header is required."
      });
    }

    try {
      const response = await getGatewayBatchUseCase.execute({
        authorizationHeader,
        batchId: parsedParams.data.batchId
      });
      return await reply.status(200).send(toOpenAiBatch(response.batch));
    } catch (error) {
      if (error instanceof GatewayApiKeyAuthenticationError) {
        return reply.status(401).send({
          error: "GATEWAY_API_KEY_AUTHENTICATION_ERROR",
          message: error.message
        });
      }
      if (error instanceof GatewayBatchNotFoundError) {
        return reply.status(404).send({
          error: "GATEWAY_BATCH_NOT_FOUND",
          message: error.message
        });
      }
      throw error;
    }
  });

  app.post("/v1/batches/:batchId/cancel", async (request, reply) => {
    const parsedParams = z
      .object({ batchId: z.uuid() })
      .safeParse(request.params);
    const authorizationHeader = request.headers.authorization;
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedParams.error.issues[0]?.message ?? "Invalid request."
      });
    }
    if (typeof authorizationHeader !== "string") {
      return reply.status(401).send({
        error: "GATEWAY_AUTHORIZATION_MISSING",
        message: "An Authorization: Bearer <org_api_key> header is required."
      });
    }

    try {
      const response = await cancelGatewayBatchUseCase.execute({
        authorizationHeader,
        batchId: parsedParams.data.batchId
      });
      return await reply.status(200).send(toOpenAiBatch(response.batch));
    } catch (error) {
      if (error instanceof GatewayApiKeyAuthenticationError) {
        return reply.status(401).send({
          error: "GATEWAY_API_KEY_AUTHENTICATION_ERROR",
          message: error.message
        });
      }
      if (error instanceof GatewayBatchNotFoundError) {
        return reply.status(404).send({
          error: "GATEWAY_BATCH_NOT_FOUND",
          message: error.message
        });
      }
      throw error;
    }
  });
}

function toOpenAiBatch(batch: {
  id: string;
  inputFileId: string;
  outputFileId: string | null;
  errorFileId: string | null;
  endpoint: string;
  completionWindow: string;
  status: string;
  createdAt: string;
  inProgressAt: string | null;
  completedAt: string | null;
  requestCounts: {
    total: number;
    completed: number;
    failed: number;
  };
}) {
  return {
    id: batch.id,
    object: "batch",
    endpoint: batch.endpoint,
    input_file_id: batch.inputFileId,
    output_file_id: batch.outputFileId,
    error_file_id: batch.errorFileId,
    completion_window: batch.completionWindow,
    status: batch.status,
    created_at: Math.floor(new Date(batch.createdAt).getTime() / 1000),
    in_progress_at:
      batch.inProgressAt === null
        ? null
        : Math.floor(new Date(batch.inProgressAt).getTime() / 1000),
    completed_at:
      batch.completedAt === null
        ? null
        : Math.floor(new Date(batch.completedAt).getTime() / 1000),
    request_counts: batch.requestCounts
  };
}
