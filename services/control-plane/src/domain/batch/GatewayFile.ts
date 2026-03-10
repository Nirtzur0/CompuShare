import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import {
  parseOrganizationApiKeyEnvironment,
  type OrganizationApiKeyEnvironment
} from "../identity/OrganizationApiKeyEnvironment.js";
import { OrganizationId } from "../identity/OrganizationId.js";

export type GatewayFilePurpose = "batch";

export interface GatewayFileSnapshot {
  id: string;
  organizationId: string;
  environment: OrganizationApiKeyEnvironment;
  purpose: GatewayFilePurpose;
  filename: string;
  mediaType: string;
  bytes: number;
  createdByUserId: string;
  createdAt: string;
}

export class GatewayFile {
  private constructor(
    public readonly id: string,
    public readonly organizationId: OrganizationId,
    public readonly environment: OrganizationApiKeyEnvironment,
    public readonly purpose: GatewayFilePurpose,
    public readonly filename: string,
    public readonly mediaType: string,
    public readonly bytes: number,
    public readonly content: string,
    public readonly createdByUserId: string,
    public readonly createdAt: Date
  ) {}

  public static upload(input: {
    organizationId: string;
    environment: string;
    purpose: GatewayFilePurpose;
    filename: string;
    mediaType: string;
    bytes: number;
    content: string;
    createdByUserId: string;
    createdAt: Date;
  }): GatewayFile {
    return new GatewayFile(
      randomUUID(),
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      input.purpose,
      this.parseFilename(input.filename),
      this.parseMediaType(input.mediaType),
      this.parseBytes(input.bytes),
      this.parseContent(input.content),
      input.createdByUserId.trim(),
      input.createdAt
    );
  }

  public static rehydrate(input: {
    id: string;
    organizationId: string;
    environment: string;
    purpose: GatewayFilePurpose;
    filename: string;
    mediaType: string;
    bytes: number;
    content: string;
    createdByUserId: string;
    createdAt: Date;
  }): GatewayFile {
    return new GatewayFile(
      input.id,
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      input.purpose,
      this.parseFilename(input.filename),
      this.parseMediaType(input.mediaType),
      this.parseBytes(input.bytes),
      this.parseContent(input.content),
      input.createdByUserId.trim(),
      input.createdAt
    );
  }

  public toSnapshot(): GatewayFileSnapshot {
    return {
      id: this.id,
      organizationId: this.organizationId.value,
      environment: this.environment,
      purpose: this.purpose,
      filename: this.filename,
      mediaType: this.mediaType,
      bytes: this.bytes,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt.toISOString()
    };
  }

  private static parseFilename(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 255) {
      throw new DomainValidationError(
        "Gateway file names must be between 1 and 255 characters."
      );
    }
    return trimmed;
  }

  private static parseMediaType(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Gateway file media types must be between 3 and 120 characters."
      );
    }
    return trimmed;
  }

  private static parseBytes(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 10_000_000) {
      throw new DomainValidationError(
        "Gateway file bytes must be an integer between 1 and 10000000."
      );
    }
    return value;
  }

  private static parseContent(value: string): string {
    if (value.length < 1) {
      throw new DomainValidationError("Gateway files cannot be empty.");
    }
    return value;
  }
}
