import { z } from "zod";
import {
  GatewayUpstreamRequestError,
  GatewayUpstreamResponseError,
  type DispatchChatCompletionRequest,
  type DispatchEmbeddingRequest,
  type GatewayChatCompletionResponse,
  type GatewayEmbeddingResponse,
  type GatewayUpstreamClient
} from "../../application/gateway/ports/GatewayUpstreamClient.js";

const gatewayChatCompletionResponseSchema = z.looseObject({
  id: z.string().min(1),
  object: z.string().min(1),
  created: z.number().int(),
  model: z.string().min(1),
  choices: z
    .array(
      z.looseObject({
        index: z.number().int(),
        finish_reason: z.string().nullable(),
        message: z.looseObject({
          role: z.string().min(1),
          content: z.string().nullable()
        })
      })
    )
    .min(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative()
  })
});

const gatewayEmbeddingResponseSchema = z.object({
  object: z.literal("list"),
  data: z
    .array(
      z.object({
        object: z.literal("embedding"),
        index: z.number().int().nonnegative(),
        embedding: z.array(z.number())
      })
    )
    .min(1),
  model: z.string().min(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative()
  })
});

export class FetchGatewayUpstreamClient implements GatewayUpstreamClient {
  public constructor(private readonly fetchFn: typeof fetch = fetch) {}

  public async dispatchChatCompletion(
    request: DispatchChatCompletionRequest
  ): Promise<GatewayChatCompletionResponse> {
    let response: Response;

    try {
      response = await this.fetchFn(request.endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...request.headers
        },
        body: JSON.stringify(request.request)
      });
    } catch (error) {
      throw new GatewayUpstreamRequestError(
        error instanceof Error ? error.message : undefined
      );
    }

    if (!response.ok) {
      throw new GatewayUpstreamRequestError(
        `Upstream provider returned HTTP ${String(response.status)}.`
      );
    }

    const payload: unknown = await response.json();
    const parsedPayload =
      gatewayChatCompletionResponseSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new GatewayUpstreamResponseError(
        parsedPayload.error.issues[0]?.message
      );
    }

    return parsedPayload.data;
  }

  public async dispatchEmbedding(
    request: DispatchEmbeddingRequest
  ): Promise<GatewayEmbeddingResponse> {
    let response: Response;

    try {
      response = await this.fetchFn(request.endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...request.headers
        },
        body: JSON.stringify(request.request)
      });
    } catch (error) {
      throw new GatewayUpstreamRequestError(
        error instanceof Error ? error.message : undefined
      );
    }

    if (!response.ok) {
      throw new GatewayUpstreamRequestError(
        `Upstream provider returned HTTP ${String(response.status)}.`
      );
    }

    const payload: unknown = await response.json();
    const parsedPayload = gatewayEmbeddingResponseSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new GatewayUpstreamResponseError(
        parsedPayload.error.issues[0]?.message
      );
    }

    return parsedPayload.data;
  }
}
