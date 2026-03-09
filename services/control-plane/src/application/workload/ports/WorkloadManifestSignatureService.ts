import type { DeployableWorkloadManifest } from "../../../domain/workload/DeployableWorkloadManifest.js";
import type { SignedDeployableWorkloadManifest } from "../../../domain/workload/SignedDeployableWorkloadManifest.js";

export interface WorkloadManifestSignatureService {
  sign(
    manifest: DeployableWorkloadManifest,
    signedAt: Date
  ): SignedDeployableWorkloadManifest;
}
