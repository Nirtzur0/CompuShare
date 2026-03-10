export interface GatewayChatCompletionMessage {
  role: string;
  content: string;
}

export interface GatewayExecutionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GatewayChatCompletionRequest {
  model: string;
  messages: readonly GatewayChatCompletionMessage[];
  stream?: false | undefined;
  max_tokens?: number | undefined;
  temperature?: number | undefined;
  top_p?: number | undefined;
}

export interface GatewayChatCompletionChoice {
  index: number;
  finish_reason: string | null;
  message: {
    role: string;
    content: string | null;
  };
}

export interface GatewayChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: readonly GatewayChatCompletionChoice[];
  usage: GatewayExecutionUsage;
}

export interface GatewayEmbeddingRequest {
  model: string;
  input: string | readonly string[];
  encoding_format?: "float" | undefined;
}

export interface GatewayEmbeddingResponse {
  object: "list";
  data: readonly {
    object: "embedding";
    index: number;
    embedding: readonly number[];
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface DispatchChatCompletionRequest {
  endpointUrl: string;
  request: GatewayChatCompletionRequest;
  headers?: Readonly<Record<string, string>>;
}

export interface DispatchEmbeddingRequest {
  endpointUrl: string;
  request: GatewayEmbeddingRequest;
  headers?: Readonly<Record<string, string>>;
}

export class GatewayUpstreamRequestError extends Error {
  public constructor(message = "The upstream provider request failed.") {
    super(message);
    this.name = "GatewayUpstreamRequestError";
  }
}

export class GatewayUpstreamResponseError extends Error {
  public constructor(message = "The upstream provider response was invalid.") {
    super(message);
    this.name = "GatewayUpstreamResponseError";
  }
}

export interface GatewayUpstreamClient {
  dispatchChatCompletion(
    request: DispatchChatCompletionRequest
  ): Promise<GatewayChatCompletionResponse>;

  dispatchEmbedding(
    request: DispatchEmbeddingRequest
  ): Promise<GatewayEmbeddingResponse>;
}
