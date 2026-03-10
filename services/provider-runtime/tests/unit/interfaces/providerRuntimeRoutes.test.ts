import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  PrivateConnectorControlPlaneRejectedError,
  PrivateConnectorControlPlaneRequestError,
  PrivateConnectorControlPlaneResponseError,
} from "../../../src/application/runtime/ports/PrivateConnectorControlPlaneClient.js";
import {
  PrivateConnectorUpstreamResponseError,
  PrivateConnectorUpstreamRequestError,
  type ServePrivateConnectorChatCompletionUseCase,
} from "../../../src/application/runtime/ServePrivateConnectorChatCompletionUseCase.js";
import {
  ProviderRuntimeAdmissionRejectedError,
  ProviderRuntimeAdmissionRequestError,
  ProviderRuntimeAdmissionResponseError,
} from "../../../src/application/runtime/ports/ProviderRuntimeAdmissionClient.js";
import type { ServeMockChatCompletionUseCase } from "../../../src/application/runtime/ServeMockChatCompletionUseCase.js";
import type { ServeMockEmbeddingUseCase } from "../../../src/application/runtime/ServeMockEmbeddingUseCase.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function createApp(
  execute?: Pick<ServeMockChatCompletionUseCase, "execute">["execute"],
  executeEmbedding?: Pick<ServeMockEmbeddingUseCase, "execute">["execute"],
  executePrivateConnector?: Pick<
    ServePrivateConnectorChatCompletionUseCase,
    "execute"
  >["execute"],
): FastifyInstance {
  return buildApp({
    ...(execute === undefined
      ? {}
      : {
          serveMockChatCompletionUseCase: {
            execute,
          },
        }),
    ...(executeEmbedding === undefined
      ? {}
      : {
          serveMockEmbeddingUseCase: {
            execute: executeEmbedding,
          },
        }),
    ...(executePrivateConnector === undefined
      ? {}
      : {
          servePrivateConnectorChatCompletionUseCase: {
            execute: executePrivateConnector,
          },
        }),
  });
}

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
      customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
      sensitivityClass: "standard_business",
      createdAt: "2026-03-16T10:00:00.000Z",
    }),
    "utf8",
  ).toString("base64url");
}

function encodePrivateGrantHeader(): string {
  return Buffer.from(
    JSON.stringify({
      grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      environment: "development",
      requestKind: "chat.completions",
      requestModelAlias: "openai/gpt-oss-120b-like",
      upstreamModelId: "gpt-oss-120b-instruct",
      maxTokens: 4096,
      issuedAt: "2026-03-10T10:00:00.000Z",
      expiresAt: "2026-03-10T10:04:00.000Z",
    }),
    "utf8",
  ).toString("base64url");
}

describe("provider runtime routes", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    apps.length = 0;
  });

  it("returns a mock completion for valid forwarded requests", async () => {
    const app = createApp(() =>
      Promise.resolve({
        id: "chatcmpl_local_123",
        object: "chat.completion",
        created: 1_773_624_000,
        model: "gpt-oss-120b-instruct",
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content:
                "Local provider runtime accepted the signed workload bundle.",
            },
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 24,
          total_tokens: 29,
        },
      }),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "chat.completion",
      usage: {
        total_tokens: 29,
      },
    });
  });

  it("rejects missing workload headers", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("rejects invalid query parameters", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=not-a-uuid&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("serves private connector chat completions", async () => {
    const app = createApp(
      undefined,
      undefined,
      () =>
        Promise.resolve({
          id: "chatcmpl_private_123",
          object: "chat.completion",
          created: 1_773_624_000,
          model: "gpt-oss-120b-instruct",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: "Private connector served this request.",
              },
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 24,
            total_tokens: 29,
          },
        }),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "chat.completion",
      usage: {
        total_tokens: 29,
      },
    });
  });

  it("rejects missing private connector execution headers", async () => {
    const app = createApp(undefined, undefined, () =>
      Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("rejects invalid private connector request payloads", async () => {
    const app = createApp(undefined, undefined, () =>
      Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "ok",
        messages: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("maps private connector admission rejections to 503", async () => {
    const app = createApp(
      undefined,
      undefined,
      () => Promise.reject(new PrivateConnectorControlPlaneRejectedError("blocked")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_RUNTIME_ADMISSION_REJECTED",
    });
  });

  it("maps private connector control-plane request failures to 502", async () => {
    const app = createApp(
      undefined,
      undefined,
      () =>
        Promise.reject(new PrivateConnectorControlPlaneRequestError("boom")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_CONTROL_PLANE_REQUEST_ERROR",
    });
  });

  it("maps private connector upstream response failures to 502", async () => {
    const app = createApp(
      undefined,
      undefined,
      () =>
        Promise.reject(
          new PrivateConnectorUpstreamResponseError("invalid payload"),
        ),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_UPSTREAM_RESPONSE_ERROR",
    });
  });

  it("maps private connector upstream request failures to 502", async () => {
    const app = createApp(
      undefined,
      undefined,
      () =>
        Promise.reject(
          new PrivateConnectorUpstreamRequestError("network unreachable"),
        ),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_UPSTREAM_REQUEST_ERROR",
    });
  });

  it("maps private connector control-plane response failures to 502", async () => {
    const app = createApp(
      undefined,
      undefined,
      () =>
        Promise.reject(
          new PrivateConnectorControlPlaneResponseError("invalid payload"),
        ),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_CONNECTOR_CONTROL_PLANE_RESPONSE_ERROR",
    });
  });

  it("surfaces unexpected private connector failures as 500", async () => {
    const app = createApp(
      undefined,
      undefined,
      () => Promise.reject(new Error("private exploded")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(500);
  });

  it("rejects malformed private execution grant headers", async () => {
    const app = createApp(undefined, undefined, () =>
      Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": "***",
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_EXECUTION_GRANT_HEADER_INVALID",
    });
  });

  it("rejects private execution grant headers that are valid base64url but not json", async () => {
    const app = createApp(undefined, undefined, () =>
      Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": Buffer.from(
          "not-json",
          "utf8",
        ).toString("base64url"),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_EXECUTION_GRANT_HEADER_INVALID",
      message: "The private execution grant header must contain valid JSON.",
    });
  });

  it("rejects invalid private connector query parameters", async () => {
    const app = createApp(undefined, undefined, () =>
      Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=not-a-uuid&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": encodePrivateGrantHeader(),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("rejects private execution grants with invalid schemas", async () => {
    const app = createApp(undefined, undefined, () =>
      Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/private-connectors/chat/completions?organizationId=87057cb0-e0ca-4095-9f25-dd8103408b18&environment=development&connectorId=05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      headers: {
        "x-compushare-private-execution-grant": Buffer.from(
          JSON.stringify({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
          }),
          "utf8",
        ).toString("base64url"),
        "x-compushare-private-execution-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-private-execution-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "PRIVATE_EXECUTION_GRANT_HEADER_INVALID",
    });
  });

  it("rejects invalid request payloads", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("surfaces unexpected provider chat failures as 500", async () => {
    const app = createApp(() => Promise.reject(new Error("provider exploded")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(500);
  });

  it("rejects malformed workload bundle headers", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": "not-base64url",
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "WORKLOAD_BUNDLE_HEADER_INVALID",
    });
  });

  it("rejects workload bundle headers with invalid base64url characters", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": "***",
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "WORKLOAD_BUNDLE_HEADER_INVALID",
      message: "The workload bundle header must be valid base64url.",
    });
  });

  it("rejects workload bundle headers that do not decode to json", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": Buffer.from(
          "not-json",
          "utf8",
        ).toString("base64url"),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "WORKLOAD_BUNDLE_HEADER_INVALID",
      message: "The workload bundle header must contain valid JSON.",
    });
  });

  it("rejects schema-invalid workload bundle headers", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": Buffer.from(
          JSON.stringify({
            id: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
          }),
          "utf8",
        ).toString("base64url"),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "WORKLOAD_BUNDLE_HEADER_INVALID",
    });
  });

  it("maps admission rejection failures to 503", async () => {
    const app = createApp(() =>
      Promise.reject(
        new ProviderRuntimeAdmissionRejectedError("Admission rejected."),
      ),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: "RUNTIME_ADMISSION_REJECTED",
    });
  });

  it("maps control-plane request failures to 502", async () => {
    const app = createApp(() =>
      Promise.reject(
        new ProviderRuntimeAdmissionRequestError("Admission request failed."),
      ),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "CONTROL_PLANE_RUNTIME_ADMISSION_REQUEST_ERROR",
    });
  });

  it("maps control-plane response failures to 502", async () => {
    const app = createApp(() =>
      Promise.reject(
        new ProviderRuntimeAdmissionResponseError("Admission response failed."),
      ),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      error: "CONTROL_PLANE_RUNTIME_ADMISSION_RESPONSE_ERROR",
    });
  });

  it("returns 500 for unexpected execution failures", async () => {
    const app = createApp(() =>
      Promise.reject(new Error("unexpected failure")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.statusCode).toBe(500);
  });

  it("returns deterministic embeddings for valid forwarded requests", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () =>
        Promise.resolve({
          object: "list",
          data: [
            {
              object: "embedding",
              index: 0,
              embedding: [0.1, 0.2, 0.3],
            },
          ],
          model: "BAAI/bge-small-en-v1.5",
          usage: {
            prompt_tokens: 3,
            total_tokens: 3,
          },
        }),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "list",
      model: "BAAI/bge-small-en-v1.5",
      usage: {
        total_tokens: 3,
      },
    });
  });

  it("rejects missing workload headers for embeddings", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("rejects invalid embedding payloads", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("rejects invalid embedding workload signature headers", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature": "short",
        "x-compushare-workload-signature-key-id": "x",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });
  });

  it("maps embedding admission rejection failures to 503", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () =>
        Promise.reject(
          new ProviderRuntimeAdmissionRejectedError("Admission rejected."),
        ),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: "RUNTIME_ADMISSION_REJECTED",
    });
  });

  it("maps embedding control-plane failures to 502", async () => {
    const requestFailureApp = createApp(
      () => Promise.reject(new Error("unused")),
      () =>
        Promise.reject(
          new ProviderRuntimeAdmissionRequestError("Admission request failed."),
        ),
    );
    apps.push(requestFailureApp);
    const requestFailureResponse = await requestFailureApp.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(requestFailureResponse.statusCode).toBe(502);
    expect(requestFailureResponse.json()).toMatchObject({
      error: "CONTROL_PLANE_RUNTIME_ADMISSION_REQUEST_ERROR",
    });

    const responseFailureApp = createApp(
      () => Promise.reject(new Error("unused")),
      () =>
        Promise.reject(
          new ProviderRuntimeAdmissionResponseError(
            "Admission response failed.",
          ),
        ),
    );
    apps.push(responseFailureApp);
    const responseFailureResponse = await responseFailureApp.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(responseFailureResponse.statusCode).toBe(502);
    expect(responseFailureResponse.json()).toMatchObject({
      error: "CONTROL_PLANE_RUNTIME_ADMISSION_RESPONSE_ERROR",
    });
  });

  it("rejects invalid embedding query parameters and malformed workload bundles", async () => {
    const invalidQueryApp = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused")),
    );
    apps.push(invalidQueryApp);

    const invalidQueryResponse = await invalidQueryApp.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=not-a-uuid&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(invalidQueryResponse.statusCode).toBe(400);
    expect(invalidQueryResponse.json()).toMatchObject({
      error: "VALIDATION_ERROR",
    });

    const invalidBundleApp = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused")),
    );
    apps.push(invalidBundleApp);

    const invalidBundleResponse = await invalidBundleApp.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": Buffer.from(
          "not-json",
          "utf8",
        ).toString("base64url"),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(invalidBundleResponse.statusCode).toBe(400);
    expect(invalidBundleResponse.json()).toMatchObject({
      error: "WORKLOAD_BUNDLE_HEADER_INVALID",
    });
  });

  it("rejects schema-invalid embedding workload bundles", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": Buffer.from(
          JSON.stringify({
            id: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
          }),
          "utf8",
        ).toString("base64url"),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "WORKLOAD_BUNDLE_HEADER_INVALID",
    });
  });

  it("rejects embedding workload bundle headers with invalid base64url characters", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unused")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": "***",
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "WORKLOAD_BUNDLE_HEADER_INVALID",
      message: "The workload bundle header must be valid base64url.",
    });
  });

  it("does not register the embeddings route when no embedding use case is wired", async () => {
    const app = createApp(() => Promise.reject(new Error("unused")));
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 500 for unexpected embedding execution failures", async () => {
    const app = createApp(
      () => Promise.reject(new Error("unused")),
      () => Promise.reject(new Error("unexpected embedding failure")),
    );
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/embeddings?organizationId=b7d0c48d-998d-4c29-b7ff-5697a1384cd4&environment=development&providerNodeId=5b667085-505d-4fba-8872-fcaa85b7c77b",
      headers: {
        "x-compushare-workload-bundle": encodeBundleHeader(),
        "x-compushare-workload-signature":
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "x-compushare-workload-signature-key-id": "local-hmac-v1",
      },
      payload: {
        model: "BAAI/bge-small-en-v1.5",
        input: "Hello",
      },
    });

    expect(response.statusCode).toBe(500);
  });
});
