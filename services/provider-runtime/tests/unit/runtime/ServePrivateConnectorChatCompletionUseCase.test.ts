import { describe, expect, it, vi } from "vitest";
import {
  PrivateConnectorUpstreamRequestError,
  PrivateConnectorUpstreamResponseError,
  ServePrivateConnectorChatCompletionUseCase,
} from "../../../src/application/runtime/ServePrivateConnectorChatCompletionUseCase.js";

describe("ServePrivateConnectorChatCompletionUseCase", () => {
  it("forwards cluster-mode requests without injecting an upstream API key", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "chatcmpl-1",
            object: "chat.completion",
            created: 1_773_624_000,
            model: "gpt-oss-120b-instruct",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "cluster response",
                },
              },
            ],
            usage: {
              prompt_tokens: 5,
              completion_tokens: 7,
              total_tokens: 12,
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ),
    );
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "gpt-oss-120b-instruct",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "cluster",
      "http://127.0.0.1:3301",
      null,
      fetchMock,
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      environment: "development",
      connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      request: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
      },
      signedGrant: {
        grant: {
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
        },
        signature:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        signatureKeyId: "local-hmac-v1",
      },
    });

    expect(response.model).toBe("gpt-oss-120b-instruct");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      "content-type": "application/json",
    });
    expect((init?.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("preserves the model when the gateway alias already matches the upstream model", async () => {
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "gpt-oss-120b-instruct",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "cluster",
      "http://127.0.0.1:3301",
      null,
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "chatcmpl-3",
              object: "chat.completion",
              created: 1_773_624_000,
              model: "gpt-oss-120b-instruct",
              choices: [
                {
                  index: 0,
                  finish_reason: "stop",
                  message: {
                    role: "assistant",
                    content: "same model",
                  },
                },
              ],
              usage: {
                prompt_tokens: 3,
                completion_tokens: 4,
                total_tokens: 7,
              },
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
              },
            },
          ),
        ),
      ),
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        request: {
          model: "gpt-oss-120b-instruct",
          messages: [{ role: "user", content: "Hello" }],
        },
        signedGrant: {
          grant: {
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "development",
            requestKind: "chat.completions",
            requestModelAlias: "gpt-oss-120b-instruct",
            upstreamModelId: "gpt-oss-120b-instruct",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z",
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).resolves.toMatchObject({
      model: "gpt-oss-120b-instruct",
    });
  });

  it("injects the upstream API key in byok mode", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "chatcmpl-2",
            object: "chat.completion",
            created: 1_773_624_000,
            model: "claude-private",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "byok response",
                },
              },
            ],
            usage: {
              prompt_tokens: 8,
              completion_tokens: 6,
              total_tokens: 14,
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ),
    );
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "claude-private",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "byok_api",
      "https://api.example.com",
      "sk-byok-connector-secret",
      fetchMock,
    );

    await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      environment: "staging",
      connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      request: {
        model: "anthropic/claude-private",
        messages: [{ role: "user", content: "Hello" }],
      },
      signedGrant: {
        grant: {
          grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
          organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
          connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
          environment: "staging",
          requestKind: "chat.completions",
          requestModelAlias: "anthropic/claude-private",
          upstreamModelId: "claude-private",
          maxTokens: 4096,
          issuedAt: "2026-03-10T10:00:00.000Z",
          expiresAt: "2026-03-10T10:04:00.000Z",
        },
        signature:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        signatureKeyId: "local-hmac-v1",
      },
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      authorization: "Bearer sk-byok-connector-secret",
    });
  });

  it("rejects byok mode when the upstream API key is missing", async () => {
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "claude-private",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "byok_api",
      "https://api.example.com",
      null,
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "staging",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        request: {
          model: "anthropic/claude-private",
          messages: [{ role: "user", content: "Hello" }],
        },
        signedGrant: {
          grant: {
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            environment: "staging",
            requestKind: "chat.completions",
            requestModelAlias: "anthropic/claude-private",
            upstreamModelId: "claude-private",
            maxTokens: 4096,
            issuedAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:04:00.000Z",
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorUpstreamRequestError);
  });

  it("rejects invalid upstream payloads", async () => {
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "gpt-oss-120b-instruct",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "cluster",
      "http://127.0.0.1:3301",
      null,
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(JSON.stringify({ wrong: true }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      ),
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }],
        },
        signedGrant: {
          grant: {
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
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorUpstreamResponseError);
  });

  it("rejects upstream responses that are not json", async () => {
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "gpt-oss-120b-instruct",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "cluster",
      "http://127.0.0.1:3301",
      null,
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response("not-json", {
            status: 200,
            headers: {
              "content-type": "text/plain",
            },
          }),
        ),
      ),
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }],
        },
        signedGrant: {
          grant: {
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
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorUpstreamResponseError);
  });

  it("rejects upstream payloads that decode to null", async () => {
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "gpt-oss-120b-instruct",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "cluster",
      "http://127.0.0.1:3301",
      null,
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response("null", {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      ),
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }],
        },
        signedGrant: {
          grant: {
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
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorUpstreamResponseError);
  });

  it("rejects upstream transport failures", async () => {
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "gpt-oss-120b-instruct",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "cluster",
      "http://127.0.0.1:3301",
      null,
      vi.fn<typeof fetch>(() => Promise.reject(new Error("offline"))),
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }],
        },
        signedGrant: {
          grant: {
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
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorUpstreamRequestError);
  });

  it("rejects upstream non-success status codes", async () => {
    const useCase = new ServePrivateConnectorChatCompletionUseCase(
      {
        checkIn: () => Promise.resolve(),
        admitExecutionGrant: () =>
          Promise.resolve({
            grantId: "2fd0c70d-4a01-44fc-92ee-6e68c4fef34e",
            connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            upstreamModelId: "gpt-oss-120b-instruct",
            admittedAt: "2026-03-10T10:00:00.000Z",
          }),
      },
      "cluster",
      "http://127.0.0.1:3301",
      null,
      vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response(null, { status: 502 })),
      ),
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        environment: "development",
        connectorId: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }],
        },
        signedGrant: {
          grant: {
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
          },
          signature:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          signatureKeyId: "local-hmac-v1",
        },
      }),
    ).rejects.toThrow(PrivateConnectorUpstreamRequestError);
  });
});
