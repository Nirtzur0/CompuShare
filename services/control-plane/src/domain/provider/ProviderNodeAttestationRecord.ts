import {
  type ProviderNodeAttestationType,
  parseProviderNodeAttestationType
} from "./ProviderNodeAttestationType.js";
import { ProviderNodeId } from "./ProviderNodeId.js";

export interface ProviderNodeAttestationRecordSnapshot {
  id: string;
  providerNodeId: string;
  challengeId: string;
  attestationType: ProviderNodeAttestationType;
  attestationPublicKeyFingerprint: string;
  quotedAt: string;
  secureBootEnabled: boolean;
  pcrValues: Record<string, string>;
  verified: boolean;
  failureReason: string | null;
  recordedAt: string;
  expiresAt: string | null;
}

export class ProviderNodeAttestationRecord {
  private constructor(
    public readonly id: string,
    public readonly providerNodeId: ProviderNodeId,
    public readonly challengeId: string,
    public readonly attestationType: ProviderNodeAttestationType,
    public readonly attestationPublicKeyFingerprint: string,
    public readonly quotedAt: Date,
    public readonly secureBootEnabled: boolean,
    public readonly pcrValues: Readonly<Record<string, string>>,
    public readonly verified: boolean,
    public readonly failureReason: string | null,
    public readonly recordedAt: Date,
    public readonly expiresAt: Date | null
  ) {}

  public static record(
    input: ProviderNodeAttestationRecordSnapshot
  ): ProviderNodeAttestationRecord {
    return new ProviderNodeAttestationRecord(
      input.id,
      ProviderNodeId.create(input.providerNodeId),
      input.challengeId,
      parseProviderNodeAttestationType(input.attestationType),
      input.attestationPublicKeyFingerprint,
      new Date(input.quotedAt),
      input.secureBootEnabled,
      { ...input.pcrValues },
      input.verified,
      input.failureReason,
      new Date(input.recordedAt),
      input.expiresAt === null ? null : new Date(input.expiresAt)
    );
  }

  public toSnapshot(): ProviderNodeAttestationRecordSnapshot {
    return {
      id: this.id,
      providerNodeId: this.providerNodeId.value,
      challengeId: this.challengeId,
      attestationType: this.attestationType,
      attestationPublicKeyFingerprint: this.attestationPublicKeyFingerprint,
      quotedAt: this.quotedAt.toISOString(),
      secureBootEnabled: this.secureBootEnabled,
      pcrValues: { ...this.pcrValues },
      verified: this.verified,
      failureReason: this.failureReason,
      recordedAt: this.recordedAt.toISOString(),
      expiresAt: this.expiresAt?.toISOString() ?? null
    };
  }
}
