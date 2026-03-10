import { describe, expect, it } from "vitest";
import {
  GatewayUpstreamRequestError,
  GatewayUpstreamResponseError
} from "../../../src/application/gateway/ports/GatewayUpstreamClient.js";
import { FetchGatewayUpstreamClient } from "../../../src/infrastructure/gateway/FetchGatewayUpstreamClient.js";

describe("FetchGatewayUpstreamClient", () => {
  it("dispatches a chat completion request and validates the response", async () => {
    const client = new FetchGatewayUpstreamClient((input, init) => {
      expect(input).toBe("https://provider.example.com/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        "content-type": "application/json",
        "x-compushare-workload-signature": "abc123"
      });

      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1_772_001_200,
            model: "gpt-oss-120b-instruct",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "Hello"
                }
              }
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 18,
              total_tokens: 30
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    });

    const response = await client.dispatchChatCompletion({
      endpointUrl: "https://provider.example.com/v1/chat/completions",
      request: {
        model: "gpt-oss-120b-instruct",
        messages: [{ role: "user", content: "Hello" }]
      },
      headers: {
        "x-compushare-workload-signature": "abc123"
      }
    });

    expect(response.usage.total_tokens).toBe(30);
  });

  it("maps non-success upstream statuses to request errors", async () => {
    const client = new FetchGatewayUpstreamClient(() =>
      Promise.resolve(new Response("bad gateway", { status: 502 }))
    );

    await expect(
      client.dispatchChatCompletion({
        endpointUrl: "https://provider.example.com/v1/chat/completions",
        request: {
          model: "gpt-oss-120b-instruct",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toBeInstanceOf(GatewayUpstreamRequestError);
  });

  it("maps invalid upstream payloads to response errors", async () => {
    const client = new FetchGatewayUpstreamClient(() =>
      Promise.resolve(
        new Response(JSON.stringify({ object: "invalid" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );

    await expect(
      client.dispatchChatCompletion({
        endpointUrl: "https://provider.example.com/v1/chat/completions",
        request: {
          model: "gpt-oss-120b-instruct",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toBeInstanceOf(GatewayUpstreamResponseError);
  });

  it("maps transport failures to request errors", async () => {
    const client = new FetchGatewayUpstreamClient(() =>
      Promise.reject(new Error("socket hang up"))
    );

    await expect(
      client.dispatchChatCompletion({
        endpointUrl: "https://provider.example.com/v1/chat/completions",
        request: {
          model: "gpt-oss-120b-instruct",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toBeInstanceOf(GatewayUpstreamRequestError);
  });

  it("dispatches an embedding request and validates the response", async () => {
    const client = new FetchGatewayUpstreamClient((input, init) => {
      expect(input).toBe("https://provider.example.com/v1/embeddings");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        "content-type": "application/json",
        "x-compushare-workload-signature": "abc123"
      });

      return Promise.resolve(
        new Response(
          JSON.stringify({
            object: "list",
            data: [
              {
                object: "embedding",
                index: 0,
                embedding: [0.1, 0.2, 0.3]
              }
            ],
            model: "BAAI/bge-small-en-v1.5",
            usage: {
              prompt_tokens: 3,
              total_tokens: 3
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    });

    const response = await client.dispatchEmbedding({
      endpointUrl: "https://provider.example.com/v1/embeddings",
      request: {
        model: "BAAI/bge-small-en-v1.5",
        input: "hello"
      },
      headers: {
        "x-compushare-workload-signature": "abc123"
      }
    });

    expect(response.usage.total_tokens).toBe(3);
    expect(response.data[0]?.embedding).toEqual([0.1, 0.2, 0.3]);
  });
});
