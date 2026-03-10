import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";

export interface PrivateConnectorExecutionGrantSnapshot {
  grantId: string;
  organizationId: string;
  connectorId: string;
  environment: "development" | "staging" | "production";
  requestKind: "chat.completions";
  requestModelAlias: string;
  upstreamModelId: string;
  maxTokens: number;
  issuedAt: string;
  expiresAt: string;
}

export interface SignedPrivateConnectorExecutionGrantSnapshot {
  grant: PrivateConnectorExecutionGrantSnapshot;
  signature: string;
  signatureKeyId: string;
}

export class PrivateConnectorExecutionGrant {
  private constructor(
    public readonly grantId: string,
    public readonly organizationId: OrganizationId,
    public readonly connectorId: string,
    public readonly environment: "development" | "staging" | "production",
    public readonly requestKind: "chat.completions",
    public readonly requestModelAlias: string,
    public readonly upstreamModelId: string,
    public readonly maxTokens: number,
    public readonly issuedAt: Date,
    public readonly expiresAt: Date
  ) {}

  public static issue(input: {
    organizationId: string;
    connectorId: string;
    environment: "development" | "staging" | "production";
    requestModelAlias: string;
    upstreamModelId: string;
    maxTokens: number;
    issuedAt: Date;
    expiresAt: Date;
  }): PrivateConnectorExecutionGrant {
    return new PrivateConnectorExecutionGrant(
      randomUUID(),
      OrganizationId.create(input.organizationId),
      this.parseUuid(input.connectorId, "Private connector"),
      input.environment,
      "chat.completions",
      this.parseField(
        input.requestModelAlias,
        "Private connector request model alias"
      ),
      this.parseField(input.upstreamModelId, "Private connector upstream model ID"),
      this.parseMaxTokens(input.maxTokens),
      input.issuedAt,
      this.parseExpiry(input.issuedAt, input.expiresAt)
    );
  }

  public static rehydrate(
    snapshot: PrivateConnectorExecutionGrantSnapshot
  ): PrivateConnectorExecutionGrant {
    return new PrivateConnectorExecutionGrant(
      this.parseUuid(snapshot.grantId, "Private connector execution grant"),
      OrganizationId.create(snapshot.organizationId),
      this.parseUuid(snapshot.connectorId, "Private connector"),
      snapshot.environment,
      snapshot.requestKind,
      this.parseField(
        snapshot.requestModelAlias,
        "Private connector request model alias"
      ),
      this.parseField(snapshot.upstreamModelId, "Private connector upstream model ID"),
      this.parseMaxTokens(snapshot.maxTokens),
      new Date(snapshot.issuedAt),
      this.parseExpiry(new Date(snapshot.issuedAt), new Date(snapshot.expiresAt))
    );
  }

  public toSnapshot(): PrivateConnectorExecutionGrantSnapshot {
    return {
      grantId: this.grantId,
      organizationId: this.organizationId.value,
      connectorId: this.connectorId,
      environment: this.environment,
      requestKind: this.requestKind,
      requestModelAlias: this.requestModelAlias,
      upstreamModelId: this.upstreamModelId,
      maxTokens: this.maxTokens,
      issuedAt: this.issuedAt.toISOString(),
      expiresAt: this.expiresAt.toISOString()
    };
  }

  public toCanonicalPayload(): string {
    const snapshot = this.toSnapshot();

    return JSON.stringify(snapshot);
  }

  public isExpired(clock: Date): boolean {
    return clock.getTime() > this.expiresAt.getTime();
  }

  private static parseField(rawValue: string, label: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 160) {
      throw new DomainValidationError(
        `${label} must be between 3 and 160 characters.`
      );
    }

    return trimmed;
  }

  private static parseUuid(rawValue: string, label: string): string {
    const trimmed = rawValue.trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed
      )
    ) {
      throw new DomainValidationError(`${label} IDs must be valid UUIDs.`);
    }

    return trimmed;
  }

  private static parseMaxTokens(rawValue: number): number {
    if (!Number.isInteger(rawValue) || rawValue < 1 || rawValue > 131_072) {
      throw new DomainValidationError(
        "Private connector execution grant max tokens must be between 1 and 131072."
      );
    }

    return rawValue;
  }

  private static parseExpiry(issuedAt: Date, expiresAt: Date): Date {
    const ttlMs = expiresAt.getTime() - issuedAt.getTime();

    if (ttlMs < 1 || ttlMs > 5 * 60 * 1000) {
      throw new DomainValidationError(
        "Private connector execution grants must expire within five minutes."
      );
    }

    return expiresAt;
  }
}

export class SignedPrivateConnectorExecutionGrant {
  private constructor(
    public readonly grant: PrivateConnectorExecutionGrant,
    public readonly signature: string,
    public readonly signatureKeyId: string
  ) {}

  public static create(input: {
    grant: PrivateConnectorExecutionGrant;
    signature: string;
    signatureKeyId: string;
  }): SignedPrivateConnectorExecutionGrant {
    return new SignedPrivateConnectorExecutionGrant(
      input.grant,
      this.parseSignature(input.signature),
      this.parseSignatureKeyId(input.signatureKeyId)
    );
  }

  public static rehydrate(
    snapshot: SignedPrivateConnectorExecutionGrantSnapshot
  ): SignedPrivateConnectorExecutionGrant {
    return new SignedPrivateConnectorExecutionGrant(
      PrivateConnectorExecutionGrant.rehydrate(snapshot.grant),
      this.parseSignature(snapshot.signature),
      this.parseSignatureKeyId(snapshot.signatureKeyId)
    );
  }

  public toSnapshot(): SignedPrivateConnectorExecutionGrantSnapshot {
    return {
      grant: this.grant.toSnapshot(),
      signature: this.signature,
      signatureKeyId: this.signatureKeyId
    };
  }

  private static parseSignature(rawValue: string): string {
    const trimmed = rawValue.trim().toLowerCase();

    if (!/^[a-f0-9]{64}$/.test(trimmed)) {
      throw new DomainValidationError(
        "Private connector execution grant signatures must be 64-character hex digests."
      );
    }

    return trimmed;
  }

  private static parseSignatureKeyId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Private connector execution grant key IDs must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }
}
