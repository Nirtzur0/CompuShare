import { createHmac } from "node:crypto";
import type { WorkloadManifestSignatureService } from "../../application/workload/ports/WorkloadManifestSignatureService.js";
import type { DeployableWorkloadManifest } from "../../domain/workload/DeployableWorkloadManifest.js";
import { SignedDeployableWorkloadManifest } from "../../domain/workload/SignedDeployableWorkloadManifest.js";

export class HmacWorkloadManifestSignatureService implements WorkloadManifestSignatureService {
  public constructor(
    private readonly secret: string,
    private readonly keyId: string,
    private readonly signingIdentity: string
  ) {}

  public sign(
    manifest: DeployableWorkloadManifest,
    signedAt: Date
  ): SignedDeployableWorkloadManifest {
    return SignedDeployableWorkloadManifest.create({
      manifest,
      signature: createHmac("sha256", this.secret)
        .update(manifest.toCanonicalPayload(), "utf8")
        .digest("hex"),
      signatureKeyId: this.keyId,
      signingIdentity: this.signingIdentity,
      signedAt
    });
  }
}
