import type { ProviderTrustTier } from "./ProviderTrustTier.js";
import {
  type ProviderNodeAttestationStatus,
  parseProviderNodeAttestationStatus
} from "./ProviderNodeAttestationStatus.js";
import {
  type ProviderNodeAttestationType,
  parseProviderNodeAttestationType
} from "./ProviderNodeAttestationType.js";

export interface ProviderNodeAttestationSnapshot {
  status: ProviderNodeAttestationStatus;
  lastAttestedAt: string | null;
  attestationExpiresAt: string | null;
  attestationType: ProviderNodeAttestationType | null;
  effectiveTrustTier: ProviderTrustTier;
}

export class ProviderNodeAttestation {
  private constructor(
    public readonly status: ProviderNodeAttestationStatus,
    public readonly lastAttestedAt: Date | null,
    public readonly attestationExpiresAt: Date | null,
    public readonly attestationType: ProviderNodeAttestationType | null,
    public readonly effectiveTrustTier: ProviderTrustTier
  ) {}

  public static none(
    effectiveTrustTier: ProviderTrustTier
  ): ProviderNodeAttestation {
    return new ProviderNodeAttestation(
      "none",
      null,
      null,
      null,
      effectiveTrustTier
    );
  }

  public static rehydrate(input: {
    status: string;
    lastAttestedAt: Date | null;
    attestationExpiresAt: Date | null;
    attestationType: string | null;
    effectiveTrustTier: ProviderTrustTier;
  }): ProviderNodeAttestation {
    return new ProviderNodeAttestation(
      parseProviderNodeAttestationStatus(input.status),
      input.lastAttestedAt,
      input.attestationExpiresAt,
      input.attestationType === null
        ? null
        : parseProviderNodeAttestationType(input.attestationType),
      input.effectiveTrustTier
    );
  }

  public toSnapshot(): ProviderNodeAttestationSnapshot {
    return {
      status: this.status,
      lastAttestedAt: this.lastAttestedAt?.toISOString() ?? null,
      attestationExpiresAt: this.attestationExpiresAt?.toISOString() ?? null,
      attestationType: this.attestationType,
      effectiveTrustTier: this.effectiveTrustTier
    };
  }
}
