import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";

export type PrivateConnectorMode = "cluster" | "byok_api";
export type PrivateConnectorStatus = "pending" | "ready" | "stale" | "disabled";
export type PrivateConnectorEnvironment =
  | "development"
  | "staging"
  | "production";

export interface PrivateConnectorModelMappingSnapshot {
  requestModelAlias: string;
  upstreamModelId: string;
}

export interface PrivateConnectorSnapshot {
  id: string;
  organizationId: string;
  environment: PrivateConnectorEnvironment;
  label: string;
  mode: PrivateConnectorMode;
  endpointUrl: string;
  modelMappings: PrivateConnectorModelMappingSnapshot[];
  runtimeVersion: string | null;
  createdAt: string;
  lastCheckInAt: string | null;
  lastReadyAt: string | null;
  disabledAt: string | null;
}

export class PrivateConnectorModelMapping {
  private constructor(
    public readonly requestModelAlias: string,
    public readonly upstreamModelId: string
  ) {}

  public static create(input: PrivateConnectorModelMappingSnapshot) {
    return new PrivateConnectorModelMapping(
      this.parseAlias(input.requestModelAlias),
      this.parseUpstreamModelId(input.upstreamModelId)
    );
  }

  public toSnapshot(): PrivateConnectorModelMappingSnapshot {
    return {
      requestModelAlias: this.requestModelAlias,
      upstreamModelId: this.upstreamModelId
    };
  }

  private static parseAlias(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Private connector request model aliases must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }

  private static parseUpstreamModelId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 160) {
      throw new DomainValidationError(
        "Private connector upstream model IDs must be between 3 and 160 characters."
      );
    }

    return trimmed;
  }
}

export class PrivateConnector {
  private constructor(
    public readonly id: string,
    public readonly organizationId: OrganizationId,
    public readonly environment: PrivateConnectorEnvironment,
    public readonly label: string,
    public readonly mode: PrivateConnectorMode,
    public readonly endpointUrl: string,
    public readonly modelMappings: readonly PrivateConnectorModelMapping[],
    public readonly runtimeVersion: string | null,
    public readonly createdAt: Date,
    public readonly lastCheckInAt: Date | null,
    public readonly lastReadyAt: Date | null,
    public readonly disabledAt: Date | null
  ) {}

  public static create(input: {
    organizationId: string;
    environment: PrivateConnectorEnvironment;
    label: string;
    mode: PrivateConnectorMode;
    endpointUrl: string;
    modelMappings: readonly PrivateConnectorModelMappingSnapshot[];
    createdAt: Date;
  }): PrivateConnector {
    return new PrivateConnector(
      randomUUID(),
      OrganizationId.create(input.organizationId),
      this.parseEnvironment(input.environment),
      this.parseLabel(input.label),
      this.parseMode(input.mode),
      this.parseEndpointUrl(input.endpointUrl),
      this.parseModelMappings(input.modelMappings),
      null,
      input.createdAt,
      null,
      null,
      null
    );
  }

  public static rehydrate(input: {
    id: string;
    organizationId: string;
    environment: string;
    label: string;
    mode: string;
    endpointUrl: string;
    modelMappings: readonly PrivateConnectorModelMappingSnapshot[];
    runtimeVersion: string | null;
    createdAt: Date;
    lastCheckInAt: Date | null;
    lastReadyAt: Date | null;
    disabledAt: Date | null;
  }): PrivateConnector {
    return new PrivateConnector(
      this.parseId(input.id),
      OrganizationId.create(input.organizationId),
      this.parseEnvironment(input.environment),
      this.parseLabel(input.label),
      this.parseMode(input.mode),
      this.parseEndpointUrl(input.endpointUrl),
      this.parseModelMappings(input.modelMappings),
      this.parseRuntimeVersion(input.runtimeVersion),
      input.createdAt,
      input.lastCheckInAt,
      input.lastReadyAt,
      input.disabledAt
    );
  }

  public registerCheckIn(input: {
    occurredAt: Date;
    runtimeVersion: string | null;
  }): PrivateConnector {
    return new PrivateConnector(
      this.id,
      this.organizationId,
      this.environment,
      this.label,
      this.mode,
      this.endpointUrl,
      this.modelMappings,
      PrivateConnector.parseRuntimeVersion(input.runtimeVersion),
      this.createdAt,
      input.occurredAt,
      input.occurredAt,
      this.disabledAt
    );
  }

  public disable(disabledAt: Date): PrivateConnector {
    return new PrivateConnector(
      this.id,
      this.organizationId,
      this.environment,
      this.label,
      this.mode,
      this.endpointUrl,
      this.modelMappings,
      this.runtimeVersion,
      this.createdAt,
      this.lastCheckInAt,
      this.lastReadyAt,
      disabledAt
    );
  }

  public resolveStatus(clock: Date, staleAfterMs: number): PrivateConnectorStatus {
    if (this.disabledAt !== null) {
      return "disabled";
    }

    if (this.lastCheckInAt === null) {
      return "pending";
    }

    if (clock.getTime() - this.lastCheckInAt.getTime() > staleAfterMs) {
      return "stale";
    }

    return "ready";
  }

  public findModelMapping(
    requestModelAlias: string
  ): PrivateConnectorModelMapping | null {
    const normalized = requestModelAlias.trim();

    return (
      this.modelMappings.find(
        (mapping) => mapping.requestModelAlias === normalized
      ) ?? null
    );
  }

  public toSnapshot(): PrivateConnectorSnapshot {
    return {
      id: this.id,
      organizationId: this.organizationId.value,
      environment: this.environment,
      label: this.label,
      mode: this.mode,
      endpointUrl: this.endpointUrl,
      modelMappings: this.modelMappings.map((mapping) => mapping.toSnapshot()),
      runtimeVersion: this.runtimeVersion,
      createdAt: this.createdAt.toISOString(),
      lastCheckInAt: this.lastCheckInAt?.toISOString() ?? null,
      lastReadyAt: this.lastReadyAt?.toISOString() ?? null,
      disabledAt: this.disabledAt?.toISOString() ?? null
    };
  }

  private static parseId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed
      )
    ) {
      throw new DomainValidationError(
        "Private connector IDs must be valid UUIDs."
      );
    }

    return trimmed;
  }

  private static parseEnvironment(rawValue: string): PrivateConnectorEnvironment {
    if (
      rawValue === "development" ||
      rawValue === "staging" ||
      rawValue === "production"
    ) {
      return rawValue;
    }

    throw new DomainValidationError(
      "Private connector environments must be development, staging, or production."
    );
  }

  private static parseLabel(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Private connector labels must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }

  private static parseMode(rawValue: string): PrivateConnectorMode {
    if (rawValue === "cluster" || rawValue === "byok_api") {
      return rawValue;
    }

    throw new DomainValidationError(
      "Private connector mode must be cluster or byok_api."
    );
  }

  private static parseEndpointUrl(rawValue: string): string {
    const trimmed = rawValue.trim();
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmed);
    } catch {
      throw new DomainValidationError(
        "Private connector endpoint URLs must be valid absolute URLs."
      );
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "127.0.0.1" && parsedUrl.hostname !== "localhost") {
      throw new DomainValidationError(
        "Private connector endpoint URLs must use https unless targeting localhost."
      );
    }

    if (parsedUrl.username.length > 0 || parsedUrl.password.length > 0) {
      throw new DomainValidationError(
        "Private connector endpoint URLs must not include embedded credentials."
      );
    }

    return parsedUrl.toString();
  }

  private static parseModelMappings(
    rawValue: readonly PrivateConnectorModelMappingSnapshot[]
  ): readonly PrivateConnectorModelMapping[] {
    if (rawValue.length === 0) {
      throw new DomainValidationError(
        "Private connectors must define at least one model mapping."
      );
    }

    if (rawValue.length > 64) {
      throw new DomainValidationError(
        "Private connectors may define at most 64 model mappings."
      );
    }

    const mappings = rawValue.map((mapping) =>
      PrivateConnectorModelMapping.create(mapping)
    );
    const aliases = new Set<string>();

    for (const mapping of mappings) {
      if (aliases.has(mapping.requestModelAlias)) {
        throw new DomainValidationError(
          `Duplicate private connector model alias: ${mapping.requestModelAlias}.`
        );
      }

      aliases.add(mapping.requestModelAlias);
    }

    return mappings;
  }

  private static parseRuntimeVersion(rawValue: string | null): string | null {
    if (rawValue === null) {
      return null;
    }

    const trimmed = rawValue.trim();

    if (trimmed.length < 1 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Private connector runtime version must be between 1 and 120 characters when provided."
      );
    }

    return trimmed;
  }
}
