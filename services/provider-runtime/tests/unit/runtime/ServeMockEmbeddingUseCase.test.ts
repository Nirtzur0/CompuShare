import { describe, expect, it } from "vitest";
import { ServeMockEmbeddingUseCase } from "../../../src/application/runtime/ServeMockEmbeddingUseCase.js";

describe("ServeMockEmbeddingUseCase", () => {
  it("produces deterministic embeddings for both single and array inputs", async () => {
    const useCase = new ServeMockEmbeddingUseCase(
      {
        admitWorkloadBundle: () =>
          Promise.resolve({
            bundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
            manifestId: "embed-bge-small-en-v1",
            signatureKeyId: "local-hmac-v1",
            customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
            providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
            admittedAt: "2026-03-16T10:05:00.000Z",
          }),
      },
      4,
    );

    const single = await useCase.execute({
      organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
      environment: "development",
      providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
      request: {
        model: "cheap-embed-v1",
        input: "hello world",
      },
      signedBundle: {
        bundle: {
          id: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
          modelManifestId: "embed-bge-small-en-v1",
          imageDigest:
            "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          runtimeConfig: {
            requestKind: "embeddings",
            streamingEnabled: false,
            maxTokens: 8192,
            temperature: null,
            topP: null,
          },
          networkPolicy: "provider-endpoint-only",
          maxRuntimeSeconds: 60,
          customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
          sensitivityClass: "standard_business",
          createdAt: "2026-03-16T10:00:00.000Z",
        },
        signature:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        signatureKeyId: "local-hmac-v1",
      },
    });
    const multiple = await useCase.execute({
      organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
      environment: "development",
      providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
      request: {
        model: "cheap-embed-v1",
        input: ["hello world", "another input"],
      },
      signedBundle: {
        bundle: {
          id: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
          modelManifestId: "embed-bge-small-en-v1",
          imageDigest:
            "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          runtimeConfig: {
            requestKind: "embeddings",
            streamingEnabled: false,
            maxTokens: 8192,
            temperature: null,
            topP: null,
          },
          networkPolicy: "provider-endpoint-only",
          maxRuntimeSeconds: 60,
          customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
          sensitivityClass: "standard_business",
          createdAt: "2026-03-16T10:00:00.000Z",
        },
        signature:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        signatureKeyId: "local-hmac-v1",
      },
    });

    expect(single.data).toHaveLength(1);
    expect(single.data[0]?.embedding).toHaveLength(4);
    expect(single.usage).toEqual({
      prompt_tokens: 2,
      total_tokens: 2,
    });
    expect(multiple.data).toHaveLength(2);
    expect(multiple.usage.total_tokens).toBeGreaterThan(
      single.usage.total_tokens,
    );
    expect(multiple.data[0]?.embedding).toEqual(single.data[0]?.embedding);
  });
});
