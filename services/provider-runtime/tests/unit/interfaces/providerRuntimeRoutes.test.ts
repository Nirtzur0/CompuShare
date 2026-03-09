import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  ProviderRuntimeAdmissionRejectedError,
  ProviderRuntimeAdmissionRequestError,
  ProviderRuntimeAdmissionResponseError,
} from "../../../src/application/runtime/ports/ProviderRuntimeAdmissionClient.js";
import type { ServeMockChatCompletionUseCase } from "../../../src/application/runtime/ServeMockChatCompletionUseCase.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

function createApp(
  execute: Pick<ServeMockChatCompletionUseCase, "execute">["execute"],
): FastifyInstance {
  return buildApp({
    serveMockChatCompletionUseCase: {
      execute,
    },
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
});
