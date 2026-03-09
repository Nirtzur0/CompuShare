import { describe, expect, it } from "vitest";
import { GenerateWorkloadManifestProvenanceUseCase } from "../../../src/application/workload/GenerateWorkloadManifestProvenanceUseCase.js";
import type { WorkloadManifestProvenanceReportSnapshot } from "../../../src/domain/workload/WorkloadManifestProvenanceReport.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { HmacWorkloadManifestSignatureService } from "../../../src/infrastructure/security/HmacWorkloadManifestSignatureService.js";

describe("GenerateWorkloadManifestProvenanceUseCase", () => {
  it("signs every approved manifest/runtime pair deterministically", () => {
    const useCase = new GenerateWorkloadManifestProvenanceUseCase(
      InMemoryApprovedChatModelCatalog.createDefault(),
      new HmacWorkloadManifestSignatureService(
        "local-workload-manifest-signing-secret-1234567890",
        "ci-hmac-v1",
        "github-actions[bot]"
      ),
      () => new Date("2026-03-09T21:15:00.000Z")
    );

    const report: WorkloadManifestProvenanceReportSnapshot = useCase
      .execute()
      .toSnapshot();

    expect(report.generatedAt).toBe("2026-03-09T21:15:00.000Z");
    expect(report.recordCount).toBe(2);
    expect(report.manifests[0]).toMatchObject({
      signatureKeyId: "ci-hmac-v1",
      signingIdentity: "github-actions[bot]",
      signedAt: "2026-03-09T21:15:00.000Z",
      manifest: {
        manifestId: "chat-gpt-oss-120b-like-v1",
        providerRuntime: "kubernetes"
      }
    });
    expect(report.manifests[1]).toMatchObject({
      signatureKeyId: "ci-hmac-v1",
      signingIdentity: "github-actions[bot]",
      signedAt: "2026-03-09T21:15:00.000Z",
      manifest: {
        manifestId: "chat-gpt-oss-120b-like-v1",
        providerRuntime: "linux"
      }
    });
    expect(report.manifests[0]?.signature).not.toBe(
      report.manifests[1]?.signature
    );
  });
});
