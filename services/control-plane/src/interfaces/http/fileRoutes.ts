import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";
import { GatewayApiKeyAuthenticationError } from "../../application/identity/AuthenticateGatewayApiKeyUseCase.js";
import {
  type GetGatewayFileUseCase,
  GatewayFileNotFoundError
} from "../../application/batch/GetGatewayFileUseCase.js";
import type { UploadGatewayFileUseCase } from "../../application/batch/UploadGatewayFileUseCase.js";

function readMultipartFieldValue(field: unknown): string {
  if (Array.isArray(field)) {
    return readMultipartFieldValue(field[0]);
  }

  if (
    typeof field === "object" &&
    field !== null &&
    "value" in field &&
    typeof field.value === "string"
  ) {
    return field.value;
  }

  return "";
}

export function registerFileRoutes(
  app: FastifyInstance,
  uploadGatewayFileUseCase: Pick<UploadGatewayFileUseCase, "execute">,
  getGatewayFileUseCase: Pick<GetGatewayFileUseCase, "execute">
): void {
  app.post("/v1/files", async (request, reply) => {
    const authorizationHeader = request.headers.authorization;

    if (typeof authorizationHeader !== "string") {
      return reply.status(401).send({
        error: "GATEWAY_AUTHORIZATION_MISSING",
        message: "An Authorization: Bearer <org_api_key> header is required."
      });
    }

    const filePart = await request.file();

    if (filePart === undefined) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "A multipart file upload is required."
      });
    }

    const parsedFields = z
      .object({
        purpose: z.literal("batch")
      })
      .safeParse({
        purpose: readMultipartFieldValue(filePart.fields.purpose)
      });

    if (!parsedFields.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedFields.error.issues[0]?.message ?? "Invalid request."
      });
    }

    const content = (await filePart.toBuffer()).toString("utf8");

    try {
      const response = await uploadGatewayFileUseCase.execute({
        authorizationHeader,
        purpose: parsedFields.data.purpose,
        filename: filePart.filename,
        mediaType: filePart.mimetype || "application/octet-stream",
        bytes: Buffer.byteLength(content, "utf8"),
        content
      });

      return await reply.status(200).send({
        id: response.file.id,
        object: "file",
        purpose: response.file.purpose,
        filename: response.file.filename,
        bytes: response.file.bytes,
        created_at: Math.floor(
          new Date(response.file.createdAt).getTime() / 1000
        )
      });
    } catch (error) {
      if (error instanceof GatewayApiKeyAuthenticationError) {
        return reply.status(401).send({
          error: "GATEWAY_API_KEY_AUTHENTICATION_ERROR",
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

  app.get("/v1/files/:fileId", async (request, reply) => {
    const parsedParams = z
      .object({ fileId: z.uuid() })
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
      const response = await getGatewayFileUseCase.execute({
        authorizationHeader,
        fileId: parsedParams.data.fileId
      });
      return await reply.status(200).send({
        id: response.file.id,
        object: "file",
        purpose: response.file.purpose,
        filename: response.file.filename,
        bytes: response.file.bytes,
        created_at: Math.floor(
          new Date(response.file.createdAt).getTime() / 1000
        )
      });
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

      throw error;
    }
  });

  app.get("/v1/files/:fileId/content", async (request, reply) => {
    const parsedParams = z
      .object({ fileId: z.uuid() })
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
      const response = await getGatewayFileUseCase.execute({
        authorizationHeader,
        fileId: parsedParams.data.fileId
      });
      return await reply
        .status(200)
        .type(response.file.mediaType)
        .send(response.content);
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

      throw error;
    }
  });
}
