import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ProviderRuntimeAdmissionRejectedError,
  ProviderRuntimeAdmissionRequestError,
  ProviderRuntimeAdmissionResponseError,
} from "../../application/runtime/ports/ProviderRuntimeAdmissionClient.js";
import type {
  ServeMockChatCompletionRequest,
  ServeMockChatCompletionUseCase,
} from "../../application/runtime/ServeMockChatCompletionUseCase.js";

const querySchema = z.object({
  organizationId: z.uuid(),
  environment: z.enum(["development", "staging", "production"]),
  providerNodeId: z.uuid(),
});

const requestSchema = z.looseObject({
  model: z.string().min(3).max(120),
  messages: z
    .array(
      z.looseObject({
        role: z.enum(["system", "developer", "user", "assistant"]),
        content: z.string().min(1).max(200_000),
      }),
    )
    .min(1),
  stream: z.literal(false).optional(),
  max_tokens: z.number().int().positive().max(131_072).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().positive().max(1).optional(),
});

const headersSchema = z.object({
  "x-compushare-workload-bundle": z.string().min(1),
  "x-compushare-workload-signature": z.string().min(64).max(64),
  "x-compushare-workload-signature-key-id": z.string().min(3).max(120),
});

const signedBundleSchema = z.object({
  bundle: z.object({
    id: z.uuid(),
    modelManifestId: z.string().min(3).max(120),
    imageDigest: z.string().min(10).max(120),
    runtimeConfig: z.object({
      requestKind: z.string().min(3).max(64),
      streamingEnabled: z.boolean(),
      maxTokens: z.int().min(1).max(131_072),
      temperature: z.number().min(0).max(2).nullable(),
      topP: z.number().positive().max(1).nullable(),
    }),
    networkPolicy: z.string().min(3).max(120),
    maxRuntimeSeconds: z.int().min(1).max(3_600),
    customerOrganizationId: z.uuid(),
    sensitivityClass: z.enum(["standard_business"]),
    createdAt: z.iso.datetime(),
  }),
  signature: z.string().min(64).max(64),
  signatureKeyId: z.string().min(3).max(120),
});

export function registerProviderRuntimeRoutes(
  app: FastifyInstance,
  serveMockChatCompletionUseCase: Pick<
    ServeMockChatCompletionUseCase,
    "execute"
  >,
): void {
  app.post("/v1/chat/completions", async (request, reply) => {
    const parsedQuery = querySchema.safeParse(request.query);
    const parsedRequest = requestSchema.safeParse(request.body);
    const parsedHeaders = headersSchema.safeParse(request.headers);

    if (!parsedQuery.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedQuery.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    if (!parsedRequest.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedRequest.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    if (!parsedHeaders.success) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: parsedHeaders.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    let signedBundle: ServeMockChatCompletionRequest["signedBundle"];

    try {
      signedBundle = decodeSignedBundle({
        encodedBundle: parsedHeaders.data["x-compushare-workload-bundle"],
        signature: parsedHeaders.data["x-compushare-workload-signature"],
        signatureKeyId:
          parsedHeaders.data["x-compushare-workload-signature-key-id"],
      });
    } catch (error) {
      return reply.status(400).send({
        error: "WORKLOAD_BUNDLE_HEADER_INVALID",
        message: error instanceof Error ? error.message : "Invalid request.",
      });
    }

    try {
      const response = await serveMockChatCompletionUseCase.execute({
        organizationId: parsedQuery.data.organizationId,
        environment: parsedQuery.data.environment,
        providerNodeId: parsedQuery.data.providerNodeId,
        request: parsedRequest.data,
        signedBundle,
      });

      return await reply.status(200).send(response);
    } catch (error) {
      if (error instanceof ProviderRuntimeAdmissionRejectedError) {
        return reply.status(503).send({
          error: "RUNTIME_ADMISSION_REJECTED",
          message: error.message,
        });
      }

      if (error instanceof ProviderRuntimeAdmissionRequestError) {
        return reply.status(502).send({
          error: "CONTROL_PLANE_RUNTIME_ADMISSION_REQUEST_ERROR",
          message: error.message,
        });
      }

      if (error instanceof ProviderRuntimeAdmissionResponseError) {
        return reply.status(502).send({
          error: "CONTROL_PLANE_RUNTIME_ADMISSION_RESPONSE_ERROR",
          message: error.message,
        });
      }

      throw error;
    }
  });
}

function decodeSignedBundle(input: {
  encodedBundle: string;
  signature: string;
  signatureKeyId: string;
}): ServeMockChatCompletionRequest["signedBundle"] {
  let decodedPayload = "";

  try {
    decodedPayload = Buffer.from(input.encodedBundle, "base64url").toString(
      "utf8",
    );
  } catch {
    throw new Error("The workload bundle header must be valid base64url.");
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(decodedPayload);
  } catch {
    throw new Error("The workload bundle header must contain valid JSON.");
  }

  const signedBundle = signedBundleSchema.safeParse({
    bundle: parsedPayload,
    signature: input.signature,
    signatureKeyId: input.signatureKeyId,
  });

  if (!signedBundle.success) {
    throw new Error(
      signedBundle.error.issues[0]?.message ?? "Invalid workload bundle.",
    );
  }

  return signedBundle.data;
}
