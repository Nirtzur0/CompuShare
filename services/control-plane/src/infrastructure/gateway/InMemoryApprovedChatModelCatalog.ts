import { ApprovedChatModelManifest } from "../../domain/gateway/ApprovedChatModelManifest.js";
import type { ApprovedChatModelCatalog } from "../../application/gateway/ports/ApprovedChatModelCatalog.js";

export class InMemoryApprovedChatModelCatalog implements ApprovedChatModelCatalog {
  private readonly manifestsByAlias: ReadonlyMap<
    string,
    ApprovedChatModelManifest
  >;
  private readonly manifestsByManifestId: ReadonlyMap<
    string,
    ApprovedChatModelManifest
  >;

  public constructor(manifests: readonly ApprovedChatModelManifest[]) {
    this.manifestsByAlias = new Map(
      manifests.map((manifest) => [manifest.alias, manifest])
    );
    this.manifestsByManifestId = new Map(
      manifests.map((manifest) => [manifest.manifestId, manifest])
    );
  }

  public static createDefault(): InMemoryApprovedChatModelCatalog {
    return new InMemoryApprovedChatModelCatalog([
      ApprovedChatModelManifest.register({
        manifestId: "chat-gpt-oss-120b-like-v1",
        alias: "openai/gpt-oss-120b-like",
        providerModelId: "gpt-oss-120b-instruct",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 120,
        supportedNodeRuntimes: ["linux", "kubernetes"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 80,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ]);
  }

  public findByAlias(alias: string): ApprovedChatModelManifest | null {
    return this.manifestsByAlias.get(alias.trim()) ?? null;
  }

  public findByManifestId(
    manifestId: string
  ): ApprovedChatModelManifest | null {
    return this.manifestsByManifestId.get(manifestId.trim()) ?? null;
  }

  public listAll(): readonly ApprovedChatModelManifest[] {
    return Array.from(this.manifestsByManifestId.values());
  }
}
