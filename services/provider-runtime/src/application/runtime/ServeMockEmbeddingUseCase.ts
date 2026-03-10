import type {
  ProviderRuntimeAdmissionClient,
  ProviderRuntimeAdmissionResponse,
} from "./ports/ProviderRuntimeAdmissionClient.js";

export interface ProviderRuntimeEmbeddingRequest {
  model: string;
  input: string | readonly string[];
  encoding_format?: "float" | undefined;
}

export interface ServeMockEmbeddingRequest {
  organizationId: string;
  environment: string;
  providerNodeId: string;
  request: ProviderRuntimeEmbeddingRequest;
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

export interface ServeMockEmbeddingResponse {
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

export class ServeMockEmbeddingUseCase {
  public constructor(
    private readonly providerRuntimeAdmissionClient: ProviderRuntimeAdmissionClient,
    private readonly embeddingDimension = 16,
  ) {}

  public async execute(
    request: ServeMockEmbeddingRequest,
  ): Promise<ServeMockEmbeddingResponse> {
    const admission =
      await this.providerRuntimeAdmissionClient.admitWorkloadBundle({
        organizationId: request.organizationId,
        environment: request.environment,
        providerNodeId: request.providerNodeId,
        expectedCustomerOrganizationId:
          request.signedBundle.bundle.customerOrganizationId,
        signedBundle: request.signedBundle,
      });
    const inputs: readonly string[] = Array.isArray(request.request.input)
      ? request.request.input
      : [request.request.input];

    return {
      object: "list",
      data: inputs.map((inputValue, index) => ({
        object: "embedding",
        index,
        embedding: this.buildEmbeddingVector(inputValue, admission),
      })),
      model: request.request.model,
      usage: {
        prompt_tokens: this.estimatePromptTokens(inputs),
        total_tokens: this.estimatePromptTokens(inputs),
      },
    };
  }

  private buildEmbeddingVector(
    inputValue: string,
    admission: ProviderRuntimeAdmissionResponse,
  ): readonly number[] {
    const seedSource = `${admission.bundleId}:${admission.manifestId}:${inputValue}`;
    let state = 0;

    for (const character of seedSource) {
      state = (state * 31 + character.charCodeAt(0)) >>> 0;
    }

    return Array.from({ length: this.embeddingDimension }, (_, index) => {
      state = (state * 1664525 + 1013904223 + index) >>> 0;
      const normalized = (state % 2000) / 1000 - 1;
      return Number(normalized.toFixed(6));
    });
  }

  private estimatePromptTokens(inputValues: readonly string[]): number {
    return Math.max(
      1,
      inputValues.reduce((total, value) => {
        const tokens = value
          .trim()
          .split(/\s+/)
          .filter((token) => token.length > 0).length;
        return total + Math.max(tokens, 1);
      }, 0),
    );
  }
}
