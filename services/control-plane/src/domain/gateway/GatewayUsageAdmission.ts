import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import {
  parseOrganizationApiKeyEnvironment,
  type OrganizationApiKeyEnvironment
} from "../identity/OrganizationApiKeyEnvironment.js";
import { OrganizationId } from "../identity/OrganizationId.js";

export type GatewayUsageRequestKind = "chat.completions" | "embeddings";
export type GatewayUsageAdmissionRequestSource = "interactive" | "batch_worker";

export interface GatewayUsageAdmissionSnapshot {
  id: string;
  organizationId: string;
  environment: OrganizationApiKeyEnvironment;
  apiKeyScopeId: string;
  requestKind: GatewayUsageRequestKind;
  requestSource: GatewayUsageAdmissionRequestSource;
  estimatedTotalTokens: number;
  actualTotalTokens: number | null;
  createdAt: string;
  settledAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
}

export class GatewayUsageAdmission {
  private constructor(
    public readonly id: string,
    public readonly organizationId: OrganizationId,
    public readonly environment: OrganizationApiKeyEnvironment,
    public readonly apiKeyScopeId: string,
    public readonly requestKind: GatewayUsageRequestKind,
    public readonly requestSource: GatewayUsageAdmissionRequestSource,
    public readonly estimatedTotalTokens: number,
    public readonly actualTotalTokens: number | null,
    public readonly createdAt: Date,
    public readonly settledAt: Date | null,
    public readonly releasedAt: Date | null,
    public readonly releaseReason: string | null
  ) {}

  public static reserve(input: {
    organizationId: string;
    environment: string;
    apiKeyScopeId: string;
    requestKind: GatewayUsageRequestKind;
    requestSource: GatewayUsageAdmissionRequestSource;
    estimatedTotalTokens: number;
    createdAt: Date;
  }): GatewayUsageAdmission {
    return new GatewayUsageAdmission(
      randomUUID(),
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      this.parseApiKeyScopeId(input.apiKeyScopeId),
      this.parseRequestKind(input.requestKind),
      this.parseRequestSource(input.requestSource),
      this.parseTokenCount(input.estimatedTotalTokens, "Estimated token"),
      null,
      input.createdAt,
      null,
      null,
      null
    );
  }

  public static rehydrate(input: GatewayUsageAdmissionSnapshot): GatewayUsageAdmission {
    return new GatewayUsageAdmission(
      input.id,
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      this.parseApiKeyScopeId(input.apiKeyScopeId),
      this.parseRequestKind(input.requestKind),
      this.parseRequestSource(input.requestSource),
      this.parseTokenCount(input.estimatedTotalTokens, "Estimated token"),
      input.actualTotalTokens === null
        ? null
        : this.parseTokenCount(input.actualTotalTokens, "Actual token"),
      new Date(input.createdAt),
      input.settledAt === null ? null : new Date(input.settledAt),
      input.releasedAt === null ? null : new Date(input.releasedAt),
      this.parseOptionalReleaseReason(input.releaseReason)
    );
  }

  public settle(actualTotalTokens: number, settledAt: Date): GatewayUsageAdmission {
    if (this.releasedAt !== null) {
      throw new DomainValidationError(
        "Released gateway usage admissions cannot be settled."
      );
    }

    return new GatewayUsageAdmission(
      this.id,
      this.organizationId,
      this.environment,
      this.apiKeyScopeId,
      this.requestKind,
      this.requestSource,
      this.estimatedTotalTokens,
      GatewayUsageAdmission.parseTokenCount(actualTotalTokens, "Actual token"),
      this.createdAt,
      settledAt,
      null,
      null
    );
  }

  public release(releasedAt: Date, releaseReason: string): GatewayUsageAdmission {
    if (this.settledAt !== null) {
      throw new DomainValidationError(
        "Settled gateway usage admissions cannot be released."
      );
    }

    return new GatewayUsageAdmission(
      this.id,
      this.organizationId,
      this.environment,
      this.apiKeyScopeId,
      this.requestKind,
      this.requestSource,
      this.estimatedTotalTokens,
      null,
      this.createdAt,
      null,
      releasedAt,
      GatewayUsageAdmission.parseReleaseReason(releaseReason)
    );
  }

  public toSnapshot(): GatewayUsageAdmissionSnapshot {
    return {
      id: this.id,
      organizationId: this.organizationId.value,
      environment: this.environment,
      apiKeyScopeId: this.apiKeyScopeId,
      requestKind: this.requestKind,
      requestSource: this.requestSource,
      estimatedTotalTokens: this.estimatedTotalTokens,
      actualTotalTokens: this.actualTotalTokens,
      createdAt: this.createdAt.toISOString(),
      settledAt: this.settledAt?.toISOString() ?? null,
      releasedAt: this.releasedAt?.toISOString() ?? null,
      releaseReason: this.releaseReason
    };
  }

  private static parseApiKeyScopeId(value: string): string {
    const trimmed = value.trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed
      )
    ) {
      throw new DomainValidationError(
        "Gateway admission scope IDs must be valid UUIDs."
      );
    }

    return trimmed;
  }

  private static parseRequestKind(value: string): GatewayUsageRequestKind {
    if (value !== "chat.completions" && value !== "embeddings") {
      throw new DomainValidationError(
        "Gateway admission request kind must be chat.completions or embeddings."
      );
    }

    return value;
  }

  private static parseRequestSource(
    value: string
  ): GatewayUsageAdmissionRequestSource {
    if (value !== "interactive" && value !== "batch_worker") {
      throw new DomainValidationError(
        "Gateway admission request source must be interactive or batch_worker."
      );
    }

    return value;
  }

  private static parseTokenCount(value: number, label: string): number {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new DomainValidationError(
        `${label} counts must be non-negative safe integers.`
      );
    }

    return value;
  }

  private static parseReleaseReason(value: string): string {
    const trimmed = value.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Gateway admission release reasons must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }

  private static parseOptionalReleaseReason(value: string | null): string | null {
    return value === null ? null : this.parseReleaseReason(value);
  }
}
