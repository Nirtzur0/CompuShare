import { afterAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";
import { FetchProviderRuntimeAdmissionClient } from "../../../src/infrastructure/controlPlane/FetchProviderRuntimeAdmissionClient.js";
import { ServeMockChatCompletionUseCase } from "../../../src/application/runtime/ServeMockChatCompletionUseCase.js";
import { ServeMockEmbeddingUseCase } from "../../../src/application/runtime/ServeMockEmbeddingUseCase.js";

function encodeBundleHeader(): string {
  return Buffer.from(
    JSON.stringify({
      id: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
      modelManifestId: "chat-gpt-oss-120b-like-v1",
      imageDigest:
        "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      runtimeConfig: {
        requestKind: "chat.completions",
        streamingEnabled: false,
        maxTokens: 256,
        temperature: 0.2,
        topP: 0.9,
      },
      networkPolicy: "restricted-egress",
      maxRuntimeSeconds: 60,
      customerOrganizationId: "bfccde67-08c5-44c8-bae6-6c2b10a89526",
      sensitivityClass: "standard_business",
      createdAt: "2026-03-16T10:00:00.000Z",
    }),
    "utf8",
  ).toString("base64url");
}

describe("provider runtime app", () => {
  const servers: FastifyInstance[] = [];

  afterAll(async () => {
    await Promise.all(servers.map(async (server) => server.close()));
  });

  it("calls control-plane runtime admission and returns a deterministic completion", async () => {
    let capturedApiKeyHeader = "";
    let capturedPayload: unknown;
    const controlPlaneApp = Fastify();
    servers.push(controlPlaneApp);

    controlPlaneApp.post(
      "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/runtime-admissions",
      (request) => {
        capturedApiKeyHeader = String(request.headers["x-api-key"] ?? "");
        capturedPayload = request.body;

        return {
          admission: {
            admitted: true,
            bundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
            manifestId: "chat-gpt-oss-120b-like-v1",
            signatureKeyId: "local-hmac-v1",
            customerOrganizationId: "bfccde67-08c5-44c8-bae6-6c2b10a89526",
            providerNodeId: "3d9b113a-c299-44c6-9d19-486f8f47a4bb",
            admittedAt: "2026-03-16T10:05:00.000Z",
          },
        };
      },
    );

    await controlPlaneApp.listen({ host: "127.0.0.1", port: 0 });
    const controlPlaneAddress = controlPlaneApp.server.address();

    if (
      controlPlaneAddress === null ||
      typeof controlPlaneAddress === "string"
    ) {
      throw new Error("Control-plane test server did not expose an address.");
    }

    const controlPlaneBaseUrl = `http://127.0.0.1:${String(controlPlaneAddress.port)}`;

    const providerRuntimeApp = buildApp({
      serveMockChatCompletionUseCase: new ServeMockChatCompletionUseCase(
        new FetchProviderRuntimeAdmissionClient(
          controlPlaneBaseUrl,
          "csk_provider_runtime_local_seed_secret_000000",
        ),
        () => new Date("2026-03-16T10:06:00.000Z"),
      ),
    });
    servers.push(providerRuntimeApp);

    const response = await providerRuntimeApp.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=eb1d6142-4bb1-47a7-9c91-214ca87a3671&environment=development&providerNodeId=3d9b113a-c299-44c6-9d19-486f8f47a4bb",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello from the gateway" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "chat.completion",
      model: "gpt-oss-120b-instruct",
      usage: {
        prompt_tokens: 5,
        completion_tokens: 24,
        total_tokens: 29,
      },
    });
    expect(capturedApiKeyHeader).toBe(
      "csk_provider_runtime_local_seed_secret_000000",
    );
    expect(capturedPayload).toMatchObject({
      expectedCustomerOrganizationId: "bfccde67-08c5-44c8-bae6-6c2b10a89526",
      signedBundle: {
        signatureKeyId: "local-hmac-v1",
      },
    });
  });

  it("maps admission rejections to 503", async () => {
    const controlPlaneApp = Fastify();
    servers.push(controlPlaneApp);

    controlPlaneApp.post(
      "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/runtime-admissions",
      async (_request, reply) => {
        return reply.status(403).send({
          error: "WORKLOAD_BUNDLE_ADMISSION_REJECTED",
          message: "Bundle drift detected.",
        });
      },
    );

    await controlPlaneApp.listen({ host: "127.0.0.1", port: 0 });
    const controlPlaneAddress = controlPlaneApp.server.address();

    if (
      controlPlaneAddress === null ||
      typeof controlPlaneAddress === "string"
    ) {
      throw new Error("Control-plane test server did not expose an address.");
    }

    const controlPlaneBaseUrl = `http://127.0.0.1:${String(controlPlaneAddress.port)}`;

    const providerRuntimeApp = buildApp({
      serveMockChatCompletionUseCase: new ServeMockChatCompletionUseCase(
        new FetchProviderRuntimeAdmissionClient(
          controlPlaneBaseUrl,
          "csk_provider_runtime_local_seed_secret_000000",
        ),
      ),
    });
    servers.push(providerRuntimeApp);

    const response = await providerRuntimeApp.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=eb1d6142-4bb1-47a7-9c91-214ca87a3671&environment=development&providerNodeId=3d9b113a-c299-44c6-9d19-486f8f47a4bb",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello from the gateway" }],
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: "RUNTIME_ADMISSION_REJECTED",
      message: "Bundle drift detected.",
    });
  });

  it("calls control-plane runtime admission and returns deterministic embeddings", async () => {
    const controlPlaneApp = Fastify();
    servers.push(controlPlaneApp);

    controlPlaneApp.post(
      "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/runtime-admissions",
      () => ({
        admission: {
          admitted: true,
          bundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
          manifestId: "embed-bge-small-en-v1",
          signatureKeyId: "local-hmac-v1",
          customerOrganizationId: "bfccde67-08c5-44c8-bae6-6c2b10a89526",
          providerNodeId: "3d9b113a-c299-44c6-9d19-486f8f47a4bb",
          admittedAt: "2026-03-16T10:05:00.000Z",
        },
      }),
    );

    await controlPlaneApp.listen({ host: "127.0.0.1", port: 0 });
    const controlPlaneAddress = controlPlaneApp.server.address();

    if (
      controlPlaneAddress === null ||
      typeof controlPlaneAddress === "string"
    ) {
      throw new Error("Control-plane test server did not expose an address.");
    }

    const controlPlaneBaseUrl = `http://127.0.0.1:${String(controlPlaneAddress.port)}`;

    const providerRuntimeApp = buildApp({
      serveMockChatCompletionUseCase: new ServeMockChatCompletionUseCase(
        new FetchProviderRuntimeAdmissionClient(
          controlPlaneBaseUrl,
          "csk_provider_runtime_local_seed_secret_000000",
        ),
      ),
      serveMockEmbeddingUseCase: new ServeMockEmbeddingUseCase(
        new FetchProviderRuntimeAdmissionClient(
          controlPlaneBaseUrl,
          "csk_provider_runtime_local_seed_secret_000000",
        ),
        4,
      ),
    });
    servers.push(providerRuntimeApp);

    const response = await providerRuntimeApp.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=eb1d6142-4bb1-47a7-9c91-214ca87a3671&environment=development&providerNodeId=3d9b113a-c299-44c6-9d19-486f8f47a4bb",
      headers: {
        "x-compushare-workload-bundle": Buffer.from(
          JSON.stringify({
            id: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
            modelManifestId: "embed-bge-small-en-v1",
            imageDigest:
              "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            runtimeConfig: {
              requestKind: "embeddings",
              streamingEnabled: false,
              maxTokens: 256,
              temperature: null,
              topP: null,
            },
            networkPolicy: "restricted-egress",
            maxRuntimeSeconds: 60,
            customerOrganizationId: "bfccde67-08c5-44c8-bae6-6c2b10a89526",
            sensitivityClass: "standard_business",
            createdAt: "2026-03-16T10:00:00.000Z",
          }),
          "utf8",
        ).toString("base64url"),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: ["hello world", "goodbye world"],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "list",
      model: "BAAI/bge-small-en-v1.5",
      usage: {
        prompt_tokens: 4,
        total_tokens: 4,
      },
    });
    const body = response.json<{
      data: { embedding: number[] }[];
    }>();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]?.embedding).toHaveLength(4);
  });
});
