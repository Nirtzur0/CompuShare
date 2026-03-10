import { ApprovedEmbeddingModelManifest } from "../../domain/gateway/ApprovedEmbeddingModelManifest.js";
import type { ApprovedEmbeddingModelCatalog } from "../../application/gateway/ports/ApprovedEmbeddingModelCatalog.js";

export class InMemoryApprovedEmbeddingModelCatalog implements ApprovedEmbeddingModelCatalog {
  private readonly manifestsByAlias: ReadonlyMap<
    string,
    ApprovedEmbeddingModelManifest
  >;
  private readonly manifestsByManifestId: ReadonlyMap<
    string,
    ApprovedEmbeddingModelManifest
  >;

  public constructor(manifests: readonly ApprovedEmbeddingModelManifest[]) {
    this.manifestsByAlias = new Map(
      manifests.map((manifest) => [manifest.alias, manifest])
    );
    this.manifestsByManifestId = new Map(
      manifests.map((manifest) => [manifest.manifestId, manifest])
    );
  }

  public static createDefault(): InMemoryApprovedEmbeddingModelCatalog {
    return new InMemoryApprovedEmbeddingModelCatalog([
      ApprovedEmbeddingModelManifest.register({
        manifestId: "embed-bge-small-en-v1",
        alias: "cheap-embed-v1",
        providerModelId: "BAAI/bge-small-en-v1.5",
        imageDigest:
          "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        networkPolicy: "provider-endpoint-only",
        maxInputsPerRequest: 128,
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 60,
        embeddingDimension: 16,
        supportedNodeRuntimes: ["linux", "kubernetes"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 40,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ]);
  }

  public findByAlias(alias: string): ApprovedEmbeddingModelManifest | null {
    return this.manifestsByAlias.get(alias.trim()) ?? null;
  }

  public findByManifestId(
    manifestId: string
  ): ApprovedEmbeddingModelManifest | null {
    return this.manifestsByManifestId.get(manifestId.trim()) ?? null;
  }

  public listAll(): readonly ApprovedEmbeddingModelManifest[] {
    return Array.from(this.manifestsByManifestId.values());
  }
}
