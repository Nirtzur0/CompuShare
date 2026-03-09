import { DomainValidationError } from "../identity/DomainValidationError.js";
import {
  type DeployableWorkloadManifest,
  type DeployableWorkloadManifestSnapshot
} from "./DeployableWorkloadManifest.js";

export interface SignedDeployableWorkloadManifestSnapshot {
  manifest: DeployableWorkloadManifestSnapshot;
  signature: string;
  signatureKeyId: string;
  signingIdentity: string;
  signedAt: string;
}

export class SignedDeployableWorkloadManifest {
  private constructor(
    public readonly manifest: DeployableWorkloadManifest,
    public readonly signature: string,
    public readonly signatureKeyId: string,
    public readonly signingIdentity: string,
    public readonly signedAt: Date
  ) {}

  public static create(input: {
    manifest: DeployableWorkloadManifest;
    signature: string;
    signatureKeyId: string;
    signingIdentity: string;
    signedAt: Date;
  }): SignedDeployableWorkloadManifest {
    return new SignedDeployableWorkloadManifest(
      input.manifest,
      this.parseSignature(input.signature),
      this.parseSignatureKeyId(input.signatureKeyId),
      this.parseSigningIdentity(input.signingIdentity),
      input.signedAt
    );
  }

  public toSnapshot(): SignedDeployableWorkloadManifestSnapshot {
    return {
      manifest: this.manifest.toSnapshot(),
      signature: this.signature,
      signatureKeyId: this.signatureKeyId,
      signingIdentity: this.signingIdentity,
      signedAt: this.signedAt.toISOString()
    };
  }

  private static parseSignature(rawValue: string): string {
    const trimmed = rawValue.trim().toLowerCase();

    if (!/^[a-f0-9]{64}$/.test(trimmed)) {
      throw new DomainValidationError(
        "Signed deployable workload manifest signature must be a 64-character hex digest."
      );
    }

    return trimmed;
  }

  private static parseSignatureKeyId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Signed deployable workload manifest key ID must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }

  private static parseSigningIdentity(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 200) {
      throw new DomainValidationError(
        "Signed deployable workload manifest signing identity must be between 3 and 200 characters."
      );
    }

    return trimmed;
  }
}
