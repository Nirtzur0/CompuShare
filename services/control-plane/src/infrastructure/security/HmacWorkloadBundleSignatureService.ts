import { createHmac } from "node:crypto";
import type { SignedWorkloadBundle } from "../../domain/workload/SignedWorkloadBundle.js";
import { SignedWorkloadBundle as SignedWorkloadBundleEntity } from "../../domain/workload/SignedWorkloadBundle.js";
import type { WorkloadBundle } from "../../domain/workload/WorkloadBundle.js";
import type { WorkloadBundleSignatureService } from "../../application/workload/ports/WorkloadBundleSignatureService.js";

export class HmacWorkloadBundleSignatureService implements WorkloadBundleSignatureService {
  public constructor(
    private readonly secret: string,
    private readonly keyId: string
  ) {}

  public sign(bundle: WorkloadBundle): SignedWorkloadBundle {
    return SignedWorkloadBundleEntity.create({
      bundle,
      signature: this.computeSignature(bundle),
      signatureKeyId: this.keyId
    });
  }

  public verify(bundle: SignedWorkloadBundle): boolean {
    return (
      bundle.signatureKeyId === this.keyId &&
      bundle.signature === this.computeSignature(bundle.bundle)
    );
  }

  private computeSignature(bundle: WorkloadBundle): string {
    return createHmac("sha256", this.secret)
      .update(bundle.toCanonicalPayload(), "utf8")
      .digest("hex");
  }
}
