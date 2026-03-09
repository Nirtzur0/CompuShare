import { DomainValidationError } from "../identity/DomainValidationError.js";
import {
  WorkloadBundle,
  type WorkloadBundleSnapshot
} from "./WorkloadBundle.js";

export interface SignedWorkloadBundleSnapshot {
  bundle: WorkloadBundleSnapshot;
  signature: string;
  signatureKeyId: string;
}

export class SignedWorkloadBundle {
  private constructor(
    public readonly bundle: WorkloadBundle,
    public readonly signature: string,
    public readonly signatureKeyId: string
  ) {}

  public static create(input: {
    bundle: WorkloadBundle;
    signature: string;
    signatureKeyId: string;
  }): SignedWorkloadBundle {
    return new SignedWorkloadBundle(
      input.bundle,
      this.parseSignature(input.signature),
      this.parseSignatureKeyId(input.signatureKeyId)
    );
  }

  public static rehydrate(
    input: SignedWorkloadBundleSnapshot
  ): SignedWorkloadBundle {
    return new SignedWorkloadBundle(
      WorkloadBundle.rehydrate({
        id: input.bundle.id,
        modelManifestId: input.bundle.modelManifestId,
        imageDigest: input.bundle.imageDigest,
        runtimeConfig: input.bundle.runtimeConfig,
        networkPolicy: input.bundle.networkPolicy,
        maxRuntimeSeconds: input.bundle.maxRuntimeSeconds,
        customerOrganizationId: input.bundle.customerOrganizationId,
        sensitivityClass: input.bundle.sensitivityClass,
        createdAt: new Date(input.bundle.createdAt)
      }),
      this.parseSignature(input.signature),
      this.parseSignatureKeyId(input.signatureKeyId)
    );
  }

  public toSnapshot(): SignedWorkloadBundleSnapshot {
    return {
      bundle: this.bundle.toSnapshot(),
      signature: this.signature,
      signatureKeyId: this.signatureKeyId
    };
  }

  private static parseSignature(rawValue: string): string {
    const trimmed = rawValue.trim().toLowerCase();

    if (!/^[a-f0-9]{64}$/.test(trimmed)) {
      throw new DomainValidationError(
        "Signed workload bundle signature must be a 64-character hex digest."
      );
    }

    return trimmed;
  }

  private static parseSignatureKeyId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Signed workload bundle key ID must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }
}
