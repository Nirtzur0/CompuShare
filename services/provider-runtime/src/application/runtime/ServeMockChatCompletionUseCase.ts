import type {
  ProviderRuntimeAdmissionClient,
  ProviderRuntimeAdmissionResponse,
} from "./ports/ProviderRuntimeAdmissionClient.js";

export interface ProviderRuntimeChatCompletionRequest {
  model: string;
  messages: readonly {
    role: string;
    content: string;
  }[];
  stream?: false | undefined;
  max_tokens?: number | undefined;
  temperature?: number | undefined;
  top_p?: number | undefined;
}

export interface ServeMockChatCompletionRequest {
  organizationId: string;
  environment: string;
  providerNodeId: string;
  request: ProviderRuntimeChatCompletionRequest;
  signedBundle: {
    bundle: {
      id: string;
      modelManifestId: string;
      imageDigest: string;
      runtimeConfig: {
        requestKind: string;
        streamingEnabled: boolean;
        maxTokens: number;
        temperature: number | null;
        topP: number | null;
      };
      networkPolicy: string;
      maxRuntimeSeconds: number;
      customerOrganizationId: string;
      sensitivityClass: "standard_business";
      createdAt: string;
    };
    signature: string;
    signatureKeyId: string;
  };
}

export interface ServeMockChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: readonly [
    {
      index: 0;
      finish_reason: "stop";
      message: {
        role: "assistant";
        content: string;
      };
    },
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ServeMockChatCompletionUseCase {
  public constructor(
    private readonly providerRuntimeAdmissionClient: ProviderRuntimeAdmissionClient,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    request: ServeMockChatCompletionRequest,
  ): Promise<ServeMockChatCompletionResponse> {
    const admission =
      await this.providerRuntimeAdmissionClient.admitWorkloadBundle({
        organizationId: request.organizationId,
        environment: request.environment,
        providerNodeId: request.providerNodeId,
        expectedCustomerOrganizationId:
          request.signedBundle.bundle.customerOrganizationId,
        signedBundle: request.signedBundle,
      });
    const createdAt = this.clock();
    const promptTokens = this.estimatePromptTokens(request.request.messages);
    const completionTokens = this.resolveCompletionTokens(request.request);

    return {
      id: `chatcmpl_local_${admission.bundleId.replace(/-/g, "").slice(0, 24)}`,
      object: "chat.completion",
      created: Math.floor(createdAt.getTime() / 1000),
      model: request.request.model,
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: this.buildMockContent(admission),
          },
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }

  private estimatePromptTokens(
    messages: readonly {
      role: string;
      content: string;
    }[],
  ): number {
    const estimatedTokens = messages.reduce((total, message) => {
      const roleTokens = Math.max(1, message.role.trim().split(/\s+/).length);
      const contentTokens = Math.max(
        1,
        message.content
          .trim()
          .split(/\s+/)
          .filter((token) => token.length > 0).length,
      );
      return total + roleTokens + contentTokens;
    }, 0);

    return Math.max(estimatedTokens, 1);
  }

  private resolveCompletionTokens(
    request: ProviderRuntimeChatCompletionRequest,
  ): number {
    const requestedMaxTokens = request.max_tokens ?? 24;
    return Math.max(1, Math.min(requestedMaxTokens, 24));
  }

  private buildMockContent(
    admission: ProviderRuntimeAdmissionResponse,
  ): string {
    return [
      "Local provider runtime accepted the signed workload bundle.",
      `Manifest: ${admission.manifestId}.`,
      `Bundle: ${admission.bundleId}.`,
    ].join(" ");
  }
}
