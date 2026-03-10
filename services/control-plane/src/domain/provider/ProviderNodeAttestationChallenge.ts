import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import { ProviderNodeId } from "./ProviderNodeId.js";

export interface ProviderNodeAttestationChallengeSnapshot {
  id: string;
  providerNodeId: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export class ProviderNodeAttestationChallenge {
  private constructor(
    public readonly id: string,
    public readonly providerNodeId: ProviderNodeId,
    public readonly nonce: string,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
    public readonly usedAt: Date | null
  ) {}

  public static issue(input: {
    providerNodeId: string;
    nonce: string;
    createdAt: Date;
    expiresAt: Date;
  }): ProviderNodeAttestationChallenge {
    return new ProviderNodeAttestationChallenge(
      randomUUID(),
      ProviderNodeId.create(input.providerNodeId),
      this.parseNonce(input.nonce),
      input.createdAt,
      input.expiresAt,
      null
    );
  }

  public static rehydrate(input: {
    id: string;
    providerNodeId: string;
    nonce: string;
    createdAt: Date;
    expiresAt: Date;
    usedAt: Date | null;
  }): ProviderNodeAttestationChallenge {
    return new ProviderNodeAttestationChallenge(
      input.id,
      ProviderNodeId.create(input.providerNodeId),
      this.parseNonce(input.nonce),
      input.createdAt,
      input.expiresAt,
      input.usedAt
    );
  }

  public isExpired(at: Date): boolean {
    return this.expiresAt.getTime() <= at.getTime();
  }

  public isUsed(): boolean {
    return this.usedAt !== null;
  }

  public toSnapshot(): ProviderNodeAttestationChallengeSnapshot {
    return {
      id: this.id,
      providerNodeId: this.providerNodeId.value,
      nonce: this.nonce,
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
      usedAt: this.usedAt?.toISOString() ?? null
    };
  }

  private static parseNonce(rawValue: string): string {
    const normalizedValue = rawValue.trim();

    if (!/^[A-Za-z0-9_-]{32,256}$/.test(normalizedValue)) {
      throw new DomainValidationError(
        "Provider node attestation nonce must be a URL-safe string between 32 and 256 characters."
      );
    }

    return normalizedValue;
  }
}
