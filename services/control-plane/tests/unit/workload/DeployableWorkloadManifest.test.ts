import { describe, expect, it } from "vitest";
import { ApprovedChatModelManifest } from "../../../src/domain/gateway/ApprovedChatModelManifest.js";
import { DeployableWorkloadManifest } from "../../../src/domain/workload/DeployableWorkloadManifest.js";
import { SignedDeployableWorkloadManifest } from "../../../src/domain/workload/SignedDeployableWorkloadManifest.js";
import { WorkloadManifestProvenanceReport } from "../../../src/domain/workload/WorkloadManifestProvenanceReport.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";

function getDefaultManifest() {
  const manifest = InMemoryApprovedChatModelCatalog.createDefault().findByAlias(
    "openai/gpt-oss-120b-like"
  );

  if (manifest === null) {
    throw new Error("Expected default approved manifest to exist.");
  }

  return manifest;
}

describe("DeployableWorkloadManifest", () => {
  it("creates a runtime-specific deployable manifest from an approved manifest", () => {
    const manifest = DeployableWorkloadManifest.fromApprovedManifest({
      manifest: getDefaultManifest(),
      providerRuntime: "linux"
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
      providerRuntime: "linux",
      placementRequirements: {
        gpuClass: "nvidia a100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      }
    });
    expect(manifest.toCanonicalPayload()).toContain(
      '"providerRuntime":"linux"'
    );
  });

  it("rejects runtimes that are not approved by the manifest", () => {
    const kubernetesOnlyManifest = ApprovedChatModelManifest.register({
      manifestId: "chat-gpt-oss-120b-like-k8s-only-v1",
      alias: "openai/gpt-oss-120b-like-k8s-only",
      providerModelId: "gpt-oss-120b-instruct",
      imageDigest:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      networkPolicy: "provider-endpoint-only",
      maxTokensPerRequest: 8192,
      maxRuntimeSeconds: 120,
      supportedNodeRuntimes: ["kubernetes"],
      placementRequirements: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      }
    });

    expect(() =>
      DeployableWorkloadManifest.fromApprovedManifest({
        manifest: kubernetesOnlyManifest,
        providerRuntime: "linux"
      })
    ).toThrow(
      "Deployable workload manifest runtime must be approved by the manifest."
    );
  });

  it("requires valid signature metadata and at least one report record", () => {
    const manifest = DeployableWorkloadManifest.fromApprovedManifest({
      manifest: getDefaultManifest(),
      providerRuntime: "linux"
    });

    expect(() =>
      SignedDeployableWorkloadManifest.create({
        manifest,
        signature: "bad-signature",
        signatureKeyId: "ci-hmac-v1",
        signingIdentity: "github-actions[bot]",
        signedAt: new Date("2026-03-09T21:00:00.000Z")
      })
    ).toThrow(
      "Signed deployable workload manifest signature must be a 64-character hex digest."
    );

    expect(() =>
      SignedDeployableWorkloadManifest.create({
        manifest,
        signature:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        signatureKeyId: "x",
        signingIdentity: "github-actions[bot]",
        signedAt: new Date("2026-03-09T21:00:00.000Z")
      })
    ).toThrow(
      "Signed deployable workload manifest key ID must be between 3 and 120 characters."
    );

    expect(() =>
      SignedDeployableWorkloadManifest.create({
        manifest,
        signature:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        signatureKeyId: "ci-hmac-v1",
        signingIdentity: "x",
        signedAt: new Date("2026-03-09T21:00:00.000Z")
      })
    ).toThrow(
      "Signed deployable workload manifest signing identity must be between 3 and 200 characters."
    );

    expect(() =>
      WorkloadManifestProvenanceReport.create({
        generatedAt: new Date("2026-03-09T21:00:00.000Z"),
        manifests: []
      })
    ).toThrow(
      "Workload manifest provenance report must include at least one signed manifest."
    );
  });
});
