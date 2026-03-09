import { DomainValidationError } from "../identity/DomainValidationError.js";
import type { ApprovedChatModelManifest } from "../gateway/ApprovedChatModelManifest.js";
import {
  parseProviderRuntime,
  type ProviderRuntime
} from "../provider/ProviderRuntime.js";
import type { PlacementRequirementsSnapshot } from "../placement/PlacementRequirements.js";

export interface DeployableWorkloadManifestSnapshot {
  manifestId: string;
  alias: string;
  providerModelId: string;
  imageDigest: string;
  networkPolicy: string;
  maxTokensPerRequest: number;
  maxRuntimeSeconds: number;
  providerRuntime: ProviderRuntime;
  placementRequirements: PlacementRequirementsSnapshot;
}

export class DeployableWorkloadManifest {
  private constructor(
    public readonly manifestId: string,
    public readonly alias: string,
    public readonly providerModelId: string,
    public readonly imageDigest: string,
    public readonly networkPolicy: string,
    public readonly maxTokensPerRequest: number,
    public readonly maxRuntimeSeconds: number,
    public readonly providerRuntime: ProviderRuntime,
    public readonly placementRequirements: PlacementRequirementsSnapshot
  ) {}

  public static fromApprovedManifest(input: {
    manifest: ApprovedChatModelManifest;
    providerRuntime: string;
  }): DeployableWorkloadManifest {
    const providerRuntime = parseProviderRuntime(input.providerRuntime);

    if (!input.manifest.supportedNodeRuntimes.includes(providerRuntime)) {
      throw new DomainValidationError(
        "Deployable workload manifest runtime must be approved by the manifest."
      );
    }

    return new DeployableWorkloadManifest(
      input.manifest.manifestId,
      input.manifest.alias,
      input.manifest.providerModelId,
      input.manifest.imageDigest,
      input.manifest.networkPolicy,
      input.manifest.maxTokensPerRequest,
      input.manifest.maxRuntimeSeconds,
      providerRuntime,
      input.manifest.placementRequirements.toSnapshot()
    );
  }

  public toSnapshot(): DeployableWorkloadManifestSnapshot {
    return {
      manifestId: this.manifestId,
      alias: this.alias,
      providerModelId: this.providerModelId,
      imageDigest: this.imageDigest,
      networkPolicy: this.networkPolicy,
      maxTokensPerRequest: this.maxTokensPerRequest,
      maxRuntimeSeconds: this.maxRuntimeSeconds,
      providerRuntime: this.providerRuntime,
      placementRequirements: {
        ...this.placementRequirements
      }
    };
  }

  public toCanonicalPayload(): string {
    const snapshot = this.toSnapshot();

    return JSON.stringify({
      manifestId: snapshot.manifestId,
      alias: snapshot.alias,
      providerModelId: snapshot.providerModelId,
      imageDigest: snapshot.imageDigest,
      networkPolicy: snapshot.networkPolicy,
      maxTokensPerRequest: snapshot.maxTokensPerRequest,
      maxRuntimeSeconds: snapshot.maxRuntimeSeconds,
      providerRuntime: snapshot.providerRuntime,
      placementRequirements: {
        gpuClass: snapshot.placementRequirements.gpuClass,
        minVramGb: snapshot.placementRequirements.minVramGb,
        region: snapshot.placementRequirements.region,
        minimumTrustTier: snapshot.placementRequirements.minimumTrustTier,
        maxPriceUsdPerHour: snapshot.placementRequirements.maxPriceUsdPerHour
      }
    });
  }
}
