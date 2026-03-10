import { describe, expect, it } from "vitest";
import { ApprovedEmbeddingModelManifest } from "../../../src/domain/gateway/ApprovedEmbeddingModelManifest.js";
import { InMemoryApprovedEmbeddingModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedEmbeddingModelCatalog.js";

describe("ApprovedEmbeddingModelManifest", () => {
  it("registers an embedding manifest and exposes the default catalog", () => {
    const manifest = ApprovedEmbeddingModelManifest.register({
      manifestId: "embed-bge-small-en-v1",
      alias: "cheap-embed-v1",
      providerModelId: "BAAI/bge-small-en-v1.5",
      imageDigest:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      networkPolicy: "provider-endpoint-only",
      maxInputsPerRequest: 128,
      maxTokensPerRequest: 8192,
      maxRuntimeSeconds: 60,
      embeddingDimension: 384,
      supportedNodeRuntimes: ["linux", "linux", "kubernetes"],
      placementRequirements: {
        gpuClass: "NVIDIA A100",
        minVramGb: 40,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      }
    });

    expect(manifest.toSnapshot()).toEqual({
      manifestId: "embed-bge-small-en-v1",
      alias: "cheap-embed-v1",
      providerModelId: "BAAI/bge-small-en-v1.5",
      imageDigest:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      networkPolicy: "provider-endpoint-only",
      maxInputsPerRequest: 128,
      maxTokensPerRequest: 8192,
      maxRuntimeSeconds: 60,
      embeddingDimension: 384,
      supportedNodeRuntimes: ["linux", "kubernetes"],
      placementRequirements: {
        gpuClass: "nvidia a100",
        minVramGb: 40,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      }
    });

    const catalog = InMemoryApprovedEmbeddingModelCatalog.createDefault();
    expect(catalog.findByAlias("cheap-embed-v1")?.toSnapshot()).toMatchObject({
      manifestId: "embed-bge-small-en-v1",
      alias: "cheap-embed-v1",
      providerModelId: "BAAI/bge-small-en-v1.5"
    });
    expect(catalog.findByAlias("missing-embed")).toBeNull();
    expect(catalog.listAll().map((entry) => entry.manifestId)).toContain(
      "embed-bge-small-en-v1"
    );
  });

  it("rejects invalid envelope and capacity values", () => {
    expect(() =>
      ApprovedEmbeddingModelManifest.register({
        manifestId: "x",
        alias: "cheap-embed-v1",
        providerModelId: "BAAI/bge-small-en-v1.5",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxInputsPerRequest: 128,
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 60,
        embeddingDimension: 384,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 40,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow("manifest ID");

    expect(() =>
      ApprovedEmbeddingModelManifest.register({
        manifestId: "embed-bge-small-en-v1",
        alias: "x",
        providerModelId: "BAAI/bge-small-en-v1.5",
        imageDigest: "bad-digest",
        networkPolicy: "provider-endpoint-only",
        maxInputsPerRequest: 0,
        maxTokensPerRequest: 0,
        maxRuntimeSeconds: 0,
        embeddingDimension: 0,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 40,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow("alias");
  });

  it("rejects invalid provider ids, policies, runtimes, and dimensions", () => {
    expect(() =>
      ApprovedEmbeddingModelManifest.register({
        manifestId: "embed-bge-small-en-v1",
        alias: "cheap-embed-v1",
        providerModelId: "x",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxInputsPerRequest: 128,
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 60,
        embeddingDimension: 384,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 40,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow("provider model ID");

    expect(() =>
      ApprovedEmbeddingModelManifest.register({
        manifestId: "embed-bge-small-en-v1",
        alias: "cheap-embed-v1",
        providerModelId: "BAAI/bge-small-en-v1.5",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "x",
        maxInputsPerRequest: 128,
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 60,
        embeddingDimension: 384,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 40,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow("network policy");

    expect(() =>
      ApprovedEmbeddingModelManifest.register({
        manifestId: "embed-bge-small-en-v1",
        alias: "cheap-embed-v1",
        providerModelId: "BAAI/bge-small-en-v1.5",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxInputsPerRequest: 128,
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 60,
        embeddingDimension: 384,
        supportedNodeRuntimes: [],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 40,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow("at least one supported node runtime");

    expect(() =>
      ApprovedEmbeddingModelManifest.register({
        manifestId: "embed-bge-small-en-v1",
        alias: "cheap-embed-v1",
        providerModelId: "BAAI/bge-small-en-v1.5",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxInputsPerRequest: 128,
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 60,
        embeddingDimension: 20_000,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 40,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow("dimension");
  });
});
