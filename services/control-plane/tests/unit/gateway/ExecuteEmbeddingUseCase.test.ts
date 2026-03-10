import { describe, expect, it } from "vitest";
import { z } from "zod";
import type {
  DispatchChatCompletionRequest,
  GatewayChatCompletionResponse
} from "../../../src/application/gateway/ports/GatewayUpstreamClient.js";
import {
  ApprovedEmbeddingModelNotFoundError,
  ExecuteEmbeddingUseCase
} from "../../../src/application/gateway/ExecuteEmbeddingUseCase.js";
import { GatewayAuthorizationHeaderError } from "../../../src/application/gateway/ExecuteChatCompletionUseCase.js";
import { PrepareSignedEmbeddingWorkloadBundleUseCase } from "../../../src/application/workload/PrepareSignedEmbeddingWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../../src/application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { InMemoryApprovedEmbeddingModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedEmbeddingModelCatalog.js";
import { HmacWorkloadBundleSignatureService } from "../../../src/infrastructure/security/HmacWorkloadBundleSignatureService.js";

const workloadBundleHeaderSchema = z.object({
  modelManifestId: z.string(),
  customerOrganizationId: z.uuid(),
  networkPolicy: z.string(),
  runtimeConfig: z.object({
    requestKind: z.literal("embeddings")
  })
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
    },
    () => new Date("2026-03-18T12:05:00.000Z"),
    InMemoryApprovedEmbeddingModelCatalog.createDefault()
  );
}

function createUnusedChatDispatch(): (
  request: DispatchChatCompletionRequest
) => Promise<GatewayChatCompletionResponse> {
  return () => Promise.reject(new Error("unused chat path"));
}

describe("ExecuteEmbeddingUseCase", () => {
  it("authenticates, resolves placement, rewrites the model, and returns embeddings", async () => {
    const forwardedRequests: {
      endpointUrl: string;
      model: string;
      headers: Readonly<Record<string, string>> | undefined;
    }[] = [];
    const meteringRequests: {
      approvedModelAlias: string;
      totalTokens: number;
      requestKind: string;
    }[] = [];
    const auditEvents: string[] = [];
    const prepareSignedEmbeddingWorkloadBundleUseCase =
      new PrepareSignedEmbeddingWorkloadBundleUseCase(
        new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "local-hmac-v1"
        ),
        createVerifier((event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }),
        () => new Date("2026-03-18T12:03:00.000Z")
      );
    const useCase = new ExecuteEmbeddingUseCase(
      {
        execute: () =>
          Promise.resolve({
            authorized: true,
            scope: {
              organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
              environment: "development"
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
      InMemoryApprovedEmbeddingModelCatalog.createDefault(),
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
              effectiveTrustTier: "t1_vetted",
              priceFloorUsdPerHour: 5.25,
              matchedGpu: {
                model: "NVIDIA A100",
                vramGb: 80,
                count: 4,
                interconnect: "nvlink"
              },
              latestBenchmark: null,
              score: 1,
              scoreBreakdown: {
                benchmarkThroughputTokensPerSecond: 690,
                priceFloorUsdPerHour: 5.25,
                pricePerformanceScore: 131.43,
                warmCacheMultiplier: 1
              },
              warmCache: {
                matched: false,
                expiresAt: null
              }
            }
          })
      } as never,
      prepareSignedEmbeddingWorkloadBundleUseCase,
      {
        dispatchChatCompletion: createUnusedChatDispatch(),
        dispatchEmbedding: ({ endpointUrl, request, headers }) => {
          forwardedRequests.push({
            endpointUrl,
            model: request.model,
            headers
          });

          return Promise.resolve({
            object: "list",
            data: [
              {
                object: "embedding",
                index: 0,
                embedding: [0.1, 0.2, 0.3]
              }
            ],
            model: request.model,
            usage: {
              prompt_tokens: 6,
              total_tokens: 6
            }
          });
        }
      },
      {
        execute: (request: {
          approvedModelAlias: string;
          totalTokens: number;
          requestKind: string;
        }) => {
          meteringRequests.push({
            approvedModelAlias: request.approvedModelAlias,
            totalTokens: request.totalTokens,
            requestKind: request.requestKind
          });
          return Promise.resolve({ event: {} as never });
        }
      } as never,
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      () => new Date("2026-03-18T12:04:00.000Z"),
      () => 100
    );

    const response = await useCase.execute({
      authorizationHeader: "Bearer csk_gateway_secret_value_000000",
      request: {
        model: "cheap-embed-v1",
        input: "Hello embeddings"
      }
    });

    expect(forwardedRequests).toHaveLength(1);
    expect(forwardedRequests[0]?.endpointUrl).toBe(
      "https://provider.example.com/v1/embeddings"
    );
    expect(forwardedRequests[0]?.model).toBe("BAAI/bge-small-en-v1.5");
    expect(
      forwardedRequests[0]?.headers?.["x-compushare-workload-bundle"]
    ).toEqual(expect.any(String));
    expect(response).toMatchObject({
      object: "list",
      model: "cheap-embed-v1",
      usage: {
        prompt_tokens: 6,
        total_tokens: 6
      }
    });
    expect(auditEvents).toEqual([
      "workload_bundle.admission.accepted",
      "gateway.embedding.forwarded"
    ]);
    expect(meteringRequests).toEqual([
      {
        approvedModelAlias: "cheap-embed-v1",
        totalTokens: 6,
        requestKind: "embeddings"
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
      modelManifestId: "embed-bge-small-en-v1",
      customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
      networkPolicy: "provider-endpoint-only",
      runtimeConfig: {
        requestKind: "embeddings"
      }
    });
  });

  it("rejects malformed authorization headers", async () => {
    const useCase = new ExecuteEmbeddingUseCase(
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      InMemoryApprovedEmbeddingModelCatalog.createDefault(),
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      new PrepareSignedEmbeddingWorkloadBundleUseCase(
        new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "local-hmac-v1"
        ),
        createVerifier(async () => Promise.resolve())
      ),
      {
        dispatchChatCompletion: createUnusedChatDispatch(),
        dispatchEmbedding: async () => Promise.reject(new Error("unused"))
      },
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      { record: async () => Promise.reject(new Error("unused")) }
    );

    await expect(
      useCase.execute({
        authorizationHeader: "Token nope",
        request: {
          model: "cheap-embed-v1",
          input: "Hello embeddings"
        }
      })
    ).rejects.toBeInstanceOf(GatewayAuthorizationHeaderError);
  });

  it("rejects unapproved model aliases before upstream dispatch", async () => {
    const useCase = new ExecuteEmbeddingUseCase(
      {
        execute: () =>
          Promise.resolve({
            authorized: true,
            scope: {
              organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
              environment: "development"
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
      InMemoryApprovedEmbeddingModelCatalog.createDefault(),
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      new PrepareSignedEmbeddingWorkloadBundleUseCase(
        new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "local-hmac-v1"
        ),
        createVerifier(async () => Promise.resolve())
      ),
      {
        dispatchChatCompletion: createUnusedChatDispatch(),
        dispatchEmbedding: async () => Promise.reject(new Error("unused"))
      },
      { execute: async () => Promise.reject(new Error("unused")) } as never,
      { record: async () => Promise.reject(new Error("unused")) }
    );

    await expect(
      useCase.execute({
        authorizationHeader: "Bearer csk_gateway_secret_value_000000",
        request: {
          model: "not-approved",
          input: "Hello embeddings"
        }
      })
    ).rejects.toBeInstanceOf(ApprovedEmbeddingModelNotFoundError);
  });
});
