import type {
  PrivateConnectorControlPlaneClient,
  PrivateConnectorRuntimeAdmissionResponse
} from "./ports/PrivateConnectorControlPlaneClient.js";

export interface ServePrivateConnectorChatCompletionRequest {
  organizationId: string;
  environment: "development" | "staging" | "production";
  connectorId: string;
  request: {
    model: string;
    messages: readonly {
      role: string;
      content: string;
    }[];
    stream?: false | undefined;
    max_tokens?: number | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
  };
  signedGrant: {
    grant: {
      grantId: string;
      organizationId: string;
      connectorId: string;
      environment: "development" | "staging" | "production";
      requestKind: "chat.completions";
      requestModelAlias: string;
      upstreamModelId: string;
      maxTokens: number;
      issuedAt: string;
      expiresAt: string;
    };
    signature: string;
    signatureKeyId: string;
  };
}

export interface ServePrivateConnectorChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: readonly {
    index: number;
    finish_reason: string | null;
    message: {
      role: string;
      content: string | null;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PrivateConnectorUpstreamRequestError extends Error {
  public constructor(message = "The private connector upstream request failed.") {
    super(message);
    this.name = "PrivateConnectorUpstreamRequestError";
  }
}

export class PrivateConnectorUpstreamResponseError extends Error {
  public constructor(message = "The private connector upstream response was invalid.") {
    super(message);
    this.name = "PrivateConnectorUpstreamResponseError";
  }
}

export class ServePrivateConnectorChatCompletionUseCase {
  public constructor(
    private readonly controlPlaneClient: PrivateConnectorControlPlaneClient,
    private readonly mode: "cluster" | "byok_api",
    private readonly forwardBaseUrl: string,
    private readonly upstreamApiKey: string | null,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  public async execute(
    request: ServePrivateConnectorChatCompletionRequest
  ): Promise<ServePrivateConnectorChatCompletionResponse> {
    const admission = await this.controlPlaneClient.admitExecutionGrant({
      organizationId: request.organizationId,
      environment: request.environment,
      connectorId: request.connectorId,
      signedGrant: request.signedGrant
    });

    return this.forward(admission, request.request);
  }

  private async forward(
    admission: PrivateConnectorRuntimeAdmissionResponse,
    request: ServePrivateConnectorChatCompletionRequest["request"]
  ): Promise<ServePrivateConnectorChatCompletionResponse> {
    const url = new URL("/v1/chat/completions", this.forwardBaseUrl);
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (this.mode === "byok_api") {
      if (this.upstreamApiKey === null) {
        throw new PrivateConnectorUpstreamRequestError(
          "PRIVATE_CONNECTOR_UPSTREAM_API_KEY is required for byok_api mode."
        );
      }

      headers.authorization = `Bearer ${this.upstreamApiKey}`;
    }

    let response: Response;

    try {
      response = await this.fetchFn(url, {
        method: "POST",
        headers,
        body: JSON.stringify(request)
      });
    } catch (error) {
      throw new PrivateConnectorUpstreamRequestError(
        error instanceof Error ? error.message : undefined
      );
    }

    if (!response.ok) {
      throw new PrivateConnectorUpstreamRequestError(
        `Private connector upstream returned HTTP ${String(response.status)}.`
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      throw new PrivateConnectorUpstreamResponseError(
        error instanceof Error ? error.message : undefined
      );
    }

    if (typeof payload !== "object" || payload === null) {
      throw new PrivateConnectorUpstreamResponseError();
    }

    const candidate = payload as Record<string, unknown>;

    if (
      typeof candidate.id !== "string" ||
      candidate.object !== "chat.completion" ||
      typeof candidate.created !== "number" ||
      !Array.isArray(candidate.choices) ||
      typeof candidate.usage !== "object" ||
      candidate.usage === null
    ) {
      throw new PrivateConnectorUpstreamResponseError();
    }

    return {
      ...(candidate as unknown as ServePrivateConnectorChatCompletionResponse),
      model: request.model === admission.upstreamModelId ? request.model : admission.upstreamModelId
    };
  }
}
