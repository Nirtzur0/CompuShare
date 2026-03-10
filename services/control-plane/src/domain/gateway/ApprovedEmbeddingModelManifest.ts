import { DomainValidationError } from "../identity/DomainValidationError.js";
import {
  PlacementRequirements,
  type PlacementRequirementsSnapshot
} from "../placement/PlacementRequirements.js";
import {
  parseProviderRuntime,
  type ProviderRuntime
} from "../provider/ProviderRuntime.js";

export interface ApprovedEmbeddingModelManifestSnapshot {
  manifestId: string;
  alias: string;
  providerModelId: string;
  imageDigest: string;
  networkPolicy: string;
  maxInputsPerRequest: number;
  maxTokensPerRequest: number;
  maxRuntimeSeconds: number;
  embeddingDimension: number;
  supportedNodeRuntimes: readonly ProviderRuntime[];
  placementRequirements: PlacementRequirementsSnapshot;
}

export class ApprovedEmbeddingModelManifest {
  private constructor(
    public readonly manifestId: string,
    public readonly alias: string,
    public readonly providerModelId: string,
    public readonly imageDigest: string,
    public readonly networkPolicy: string,
    public readonly maxInputsPerRequest: number,
    public readonly maxTokensPerRequest: number,
    public readonly maxRuntimeSeconds: number,
    public readonly embeddingDimension: number,
    public readonly supportedNodeRuntimes: readonly ProviderRuntime[],
    public readonly placementRequirements: PlacementRequirements
  ) {}

  public static register(input: {
    manifestId: string;
    alias: string;
    providerModelId: string;
    imageDigest: string;
    networkPolicy: string;
    maxInputsPerRequest: number;
    maxTokensPerRequest: number;
    maxRuntimeSeconds: number;
    embeddingDimension: number;
    supportedNodeRuntimes: readonly string[];
    placementRequirements: PlacementRequirementsSnapshot;
  }): ApprovedEmbeddingModelManifest {
    const manifestId = input.manifestId.trim();
    const alias = input.alias.trim();
    const providerModelId = input.providerModelId.trim();
    const imageDigest = input.imageDigest.trim().toLowerCase();
    const networkPolicy = input.networkPolicy.trim();

    if (manifestId.length < 3 || manifestId.length > 120) {
      throw new DomainValidationError(
        "Approved embedding model manifest ID must be between 3 and 120 characters."
      );
    }

    if (alias.length < 3 || alias.length > 120) {
      throw new DomainValidationError(
        "Approved embedding model alias must be between 3 and 120 characters."
      );
    }

    if (providerModelId.length < 3 || providerModelId.length > 200) {
      throw new DomainValidationError(
        "Approved embedding provider model ID must be between 3 and 200 characters."
      );
    }

    if (!/^sha256:[a-f0-9]{64}$/.test(imageDigest)) {
      throw new DomainValidationError(
        "Approved embedding model image digest must be a sha256 digest."
      );
    }

    if (networkPolicy.length < 3 || networkPolicy.length > 120) {
      throw new DomainValidationError(
        "Approved embedding model network policy must be between 3 and 120 characters."
      );
    }

    if (
      !Number.isInteger(input.maxInputsPerRequest) ||
      input.maxInputsPerRequest < 1 ||
      input.maxInputsPerRequest > 4096
    ) {
      throw new DomainValidationError(
        "Approved embedding model max inputs per request must be an integer between 1 and 4096."
      );
    }

    if (
      !Number.isInteger(input.maxTokensPerRequest) ||
      input.maxTokensPerRequest < 1 ||
      input.maxTokensPerRequest > 131_072
    ) {
      throw new DomainValidationError(
        "Approved embedding model max tokens per request must be an integer between 1 and 131072."
      );
    }

    if (
      !Number.isInteger(input.maxRuntimeSeconds) ||
      input.maxRuntimeSeconds < 1 ||
      input.maxRuntimeSeconds > 3600
    ) {
      throw new DomainValidationError(
        "Approved embedding model max runtime seconds must be an integer between 1 and 3600."
      );
    }

    if (
      !Number.isInteger(input.embeddingDimension) ||
      input.embeddingDimension < 1 ||
      input.embeddingDimension > 16384
    ) {
      throw new DomainValidationError(
        "Approved embedding model dimension must be an integer between 1 and 16384."
      );
    }

    const supportedNodeRuntimes = Array.from(
      new Set(
        input.supportedNodeRuntimes.map((runtime) =>
          parseProviderRuntime(runtime)
        )
      )
    );

    if (supportedNodeRuntimes.length === 0) {
      throw new DomainValidationError(
        "Approved embedding model manifest must declare at least one supported node runtime."
      );
    }

    return new ApprovedEmbeddingModelManifest(
      manifestId,
      alias,
      providerModelId,
      imageDigest,
      networkPolicy,
      input.maxInputsPerRequest,
      input.maxTokensPerRequest,
      input.maxRuntimeSeconds,
      input.embeddingDimension,
      supportedNodeRuntimes,
      PlacementRequirements.create(input.placementRequirements)
    );
  }

  public toSnapshot(): ApprovedEmbeddingModelManifestSnapshot {
    return {
      manifestId: this.manifestId,
      alias: this.alias,
      providerModelId: this.providerModelId,
      imageDigest: this.imageDigest,
      networkPolicy: this.networkPolicy,
      maxInputsPerRequest: this.maxInputsPerRequest,
      maxTokensPerRequest: this.maxTokensPerRequest,
      maxRuntimeSeconds: this.maxRuntimeSeconds,
      embeddingDimension: this.embeddingDimension,
      supportedNodeRuntimes: this.supportedNodeRuntimes,
      placementRequirements: this.placementRequirements.toSnapshot()
    };
  }
}
