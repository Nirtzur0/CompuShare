import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApprovedChatModelNotFoundError,
  ExecuteChatCompletionUseCase,
  GatewayAuthorizationHeaderError
} from "../../../src/application/gateway/ExecuteChatCompletionUseCase.js";
import type {
  DispatchEmbeddingRequest,
  GatewayEmbeddingResponse
} from "../../../src/application/gateway/ports/GatewayUpstreamClient.js";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../../src/application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../../src/application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { HmacWorkloadBundleSignatureService } from "../../../src/infrastructure/security/HmacWorkloadBundleSignatureService.js";

const workloadBundleHeaderSchema = z.object({
  modelManifestId: z.string(),
  customerOrganizationId: z.uuid(),
  networkPolicy: z.string()
});

function createVerifier(
  record: (event: { eventName: string }) => Promise<void>
) {
  return new VerifySignedWorkloadBundleAdmissionUseCase(
    new HmacWorkloadBundleSignatureService(
      "local-workload-signing-secret-1234567890",
      "local-hmac-v1"
    ),
    InMemoryApprovedChatModelCatalog.createDefault(),
    {
      record
    }
  );
}

function createUnusedEmbeddingDispatch(): (
  request: DispatchEmbeddingRequest
) => Promise<GatewayEmbeddingResponse> {
  return () => Promise.reject(new Error("unused embedding path"));
}

describe("ExecuteChatCompletionUseCase", () => {
  it("authenticates, resolves placement, rewrites the model, and returns usage", async () => {
    const forwardedRequests: {
      endpointUrl: string;
      model: string;
      headers: Readonly<Record<string, string>> | undefined;
    }[] = [];
    const meteringRequests: {
      approvedModelAlias: string;
      totalTokens: number;
    }[] = [];
    const auditEvents: string[] = [];
    const prepareSignedChatWorkloadBundleUseCase =
      new PrepareSignedChatWorkloadBundleUseCase(
        new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "local-hmac-v1"
        ),
        createVerifier((event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }),
        () => new Date("2026-03-09T20:30:00.000Z")
      );
    const useCase = new ExecuteChatCompletionUseCase(
      {
        execute: () =>
          Promise.resolve({
            authorized: true,
            scope: {
              organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
              environment: "production"
            },
            apiKey: {
              id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
              label: "Gateway key",
              secretPrefix: "csk_gateway_",
              issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
              createdAt: "2026-03-09T00:00:00.000Z",
              lastUsedAt: "2026-03-09T20:00:00.000Z"
            }
          })
      } as never,
      InMemoryApprovedChatModelCatalog.createDefault(),
      {
        execute: () =>
          Promise.resolve({
            decisionLogId: "240f21c5-6a71-4e68-9dbb-b93a663f679c",
            candidateCount: 1,
            selection: {
              providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
              providerOrganizationId: "938fbcc1-d9f2-4943-a4e7-132d11136e14",
              providerNodeLabel: "Matched Node",
              endpointUrl: "https://provider.example.com/v1/chat/completions",
              region: "eu-central-1",
              trustTier: "t1_vetted",
              priceFloorUsdPerHour: 5.25,
              matchedGpu: {
                model: "NVIDIA A100",
                vramGb: 80,
                count: 4,
                interconnect: "nvlink"
              },
              latestBenchmark: null
            }
          })
      } as never,
      prepareSignedChatWorkloadBundleUseCase,
      {
        dispatchChatCompletion: ({ endpointUrl, request, headers }) => {
          forwardedRequests.push({
            endpointUrl,
            model: request.model,
            headers
          });

          return Promise.resolve({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1_772_001_200,
            model: request.model,
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "Hello from the provider."
                }
              }
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 18,
              total_tokens: 30
            }
          });
        },
        dispatchEmbedding: createUnusedEmbeddingDispatch()
      },
      {
        execute: (request: {
          approvedModelAlias: string;
          totalTokens: number;
        }) => {
          meteringRequests.push({
            approvedModelAlias: request.approvedModelAlias,
            totalTokens: request.totalTokens
          });
          return Promise.resolve({ event: {} as never });
        }
      } as never,
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      }
    );

    const response = await useCase.execute({
      authorizationHeader: "Bearer csk_gateway_secret_value_000000",
      request: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    expect(forwardedRequests).toHaveLength(1);
    expect(forwardedRequests[0]?.endpointUrl).toBe(
      "https://provider.example.com/v1/chat/completions"
    );
    expect(forwardedRequests[0]?.model).toBe("gpt-oss-120b-instruct");
    expect(
      forwardedRequests[0]?.headers?.["x-compushare-workload-bundle"]
    ).toEqual(expect.any(String));
    expect(
      forwardedRequests[0]?.headers?.["x-compushare-workload-signature"]
    ).toEqual(expect.any(String));
    expect(
      forwardedRequests[0]?.headers?.["x-compushare-workload-signature-key-id"]
    ).toBe("local-hmac-v1");
    expect(response).toMatchObject({
      model: "openai/gpt-oss-120b-like",
      usage: {
        prompt_tokens: 12,
        completion_tokens: 18,
        total_tokens: 30
      }
    });
    expect(auditEvents).toEqual([
      "workload_bundle.admission.accepted",
      "gateway.chat_completion.forwarded"
    ]);
    expect(meteringRequests).toEqual([
      {
        approvedModelAlias: "openai/gpt-oss-120b-like",
        totalTokens: 30
      }
    ]);
    const forwardedBundle = workloadBundleHeaderSchema.parse(
      JSON.parse(
        Buffer.from(
          forwardedRequests[0]?.headers?.["x-compushare-workload-bundle"] ?? "",
          "base64url"
        ).toString("utf8")
      ) as unknown
    );

    expect(forwardedBundle).toMatchObject({
      modelManifestId: "chat-gpt-oss-120b-like-v1",
      customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
      networkPolicy: "provider-endpoint-only"
    });
  });

  it("rejects malformed authorization headers", async () => {
    const useCase = new ExecuteChatCompletionUseCase(
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      InMemoryApprovedChatModelCatalog.createDefault(),
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      new PrepareSignedChatWorkloadBundleUseCase(
        new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "local-hmac-v1"
        ),
        createVerifier(async () => Promise.resolve())
      ),
      {
        dispatchChatCompletion: async () => Promise.reject(new Error("unused")),
        dispatchEmbedding: createUnusedEmbeddingDispatch()
      },
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      { record: async () => Promise.reject(new Error("unused")) }
    );

    await expect(
      useCase.execute({
        authorizationHeader: "Token nope",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toBeInstanceOf(GatewayAuthorizationHeaderError);
  });

  it("rejects unapproved model aliases before upstream dispatch", async () => {
    const useCase = new ExecuteChatCompletionUseCase(
      {
        execute: () =>
          Promise.resolve({
            authorized: true,
            scope: {
              organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
              environment: "production"
            },
            apiKey: {
              id: "d3939649-841a-4f95-b2fa-b13d464f0d43",
              label: "Gateway key",
              secretPrefix: "csk_gateway_",
              issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
              createdAt: "2026-03-09T00:00:00.000Z",
              lastUsedAt: "2026-03-09T20:00:00.000Z"
            }
          })
      } as never,
      InMemoryApprovedChatModelCatalog.createDefault(),
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      new PrepareSignedChatWorkloadBundleUseCase(
        new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "local-hmac-v1"
        ),
        createVerifier(async () => Promise.resolve())
      ),
      {
        dispatchChatCompletion: async () => Promise.reject(new Error("unused")),
        dispatchEmbedding: createUnusedEmbeddingDispatch()
      },
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      { record: async () => Promise.reject(new Error("unused")) }
    );

    await expect(
      useCase.execute({
        authorizationHeader: "Bearer csk_gateway_secret_value_000000",
        request: {
          model: "not-approved",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toBeInstanceOf(ApprovedChatModelNotFoundError);
  });
});
