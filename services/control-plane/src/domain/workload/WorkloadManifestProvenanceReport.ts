import { DomainValidationError } from "../identity/DomainValidationError.js";
import type { SignedDeployableWorkloadManifestSnapshot } from "./SignedDeployableWorkloadManifest.js";
import type { SignedDeployableWorkloadManifest } from "./SignedDeployableWorkloadManifest.js";

export interface WorkloadManifestProvenanceReportSnapshot {
  generatedAt: string;
  recordCount: number;
  manifests: SignedDeployableWorkloadManifestSnapshot[];
}

export class WorkloadManifestProvenanceReport {
  private constructor(
    public readonly generatedAt: Date,
    public readonly manifests: readonly SignedDeployableWorkloadManifest[]
  ) {}

  public static create(input: {
    generatedAt: Date;
    manifests: readonly SignedDeployableWorkloadManifest[];
  }): WorkloadManifestProvenanceReport {
    if (input.manifests.length === 0) {
      throw new DomainValidationError(
        "Workload manifest provenance report must include at least one signed manifest."
      );
    }

    return new WorkloadManifestProvenanceReport(input.generatedAt, [
      ...input.manifests
    ]);
  }

  public toSnapshot(): WorkloadManifestProvenanceReportSnapshot {
    return {
      generatedAt: this.generatedAt.toISOString(),
      recordCount: this.manifests.length,
      manifests: this.manifests.map((manifest) => manifest.toSnapshot())
    };
  }
}
