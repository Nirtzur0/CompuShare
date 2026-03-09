import { describe, expect, it } from "vitest";
import { ApprovedChatModelManifest } from "../../../src/domain/gateway/ApprovedChatModelManifest.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";

describe("ApprovedChatModelManifest", () => {
  it("registers a manifest with placement requirements and supported runtimes", () => {
    const manifest = ApprovedChatModelManifest.register({
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
    });

    expect(manifest.toSnapshot()).toEqual({
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
        gpuClass: "nvidia a100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      }
    });
  });

  it("rejects manifests without supported runtimes", () => {
    expect(() =>
      ApprovedChatModelManifest.register({
        manifestId: "chat-gpt-oss-120b-like-v1",
        alias: "openai/gpt-oss-120b-like",
        providerModelId: "gpt-oss-120b-instruct",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 120,
        supportedNodeRuntimes: [],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 80,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrowError(
      "Approved chat model manifest must declare at least one supported node runtime."
    );
  });

  it("exposes the default approved alias catalog", () => {
    const catalog = InMemoryApprovedChatModelCatalog.createDefault();

    expect(
      catalog.findByAlias("openai/gpt-oss-120b-like")?.toSnapshot()
    ).toMatchObject({
      manifestId: "chat-gpt-oss-120b-like-v1",
      alias: "openai/gpt-oss-120b-like",
      providerModelId: "gpt-oss-120b-instruct",
      networkPolicy: "provider-endpoint-only"
    });
    expect(catalog.findByAlias("unknown-model")).toBeNull();
    expect(catalog.listAll().map((manifest) => manifest.manifestId)).toContain(
      "chat-gpt-oss-120b-like-v1"
    );
  });

  it("rejects invalid digest and policy envelope values", () => {
    expect(() =>
      ApprovedChatModelManifest.register({
        manifestId: "chat-gpt-oss-120b-like-v1",
        alias: "openai/gpt-oss-120b-like",
        providerModelId: "gpt-oss-120b-instruct",
        imageDigest: "bad-digest",
        networkPolicy: "provider-endpoint-only",
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 120,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 80,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow("Approved chat model image digest must be a sha256 digest.");

    expect(() =>
      ApprovedChatModelManifest.register({
        manifestId: "chat-gpt-oss-120b-like-v1",
        alias: "openai/gpt-oss-120b-like",
        providerModelId: "gpt-oss-120b-instruct",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxTokensPerRequest: 0,
        maxRuntimeSeconds: 120,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 80,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow(
      "Approved chat model max tokens per request must be an integer between 1 and 131072."
    );

    expect(() =>
      ApprovedChatModelManifest.register({
        manifestId: "chat-gpt-oss-120b-like-v1",
        alias: "openai/gpt-oss-120b-like",
        providerModelId: "gpt-oss-120b-instruct",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        networkPolicy: "provider-endpoint-only",
        maxTokensPerRequest: 8192,
        maxRuntimeSeconds: 0,
        supportedNodeRuntimes: ["linux"],
        placementRequirements: {
          gpuClass: "NVIDIA A100",
          minVramGb: 80,
          region: "eu-central-1",
          minimumTrustTier: "t1_vetted",
          maxPriceUsdPerHour: 10
        }
      })
    ).toThrow(
      "Approved chat model max runtime seconds must be an integer between 1 and 3600."
    );
  });
});
