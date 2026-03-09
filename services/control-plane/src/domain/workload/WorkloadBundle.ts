import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";

export type WorkloadSensitivityClass = "standard_business";
export type WorkloadRequestKind = "chat.completions";

export interface WorkloadRuntimeConfigSnapshot {
  requestKind: string;
  streamingEnabled: boolean;
  maxTokens: number;
  temperature: number | null;
  topP: number | null;
}

export interface WorkloadBundleSnapshot {
  id: string;
  modelManifestId: string;
  imageDigest: string;
  runtimeConfig: WorkloadRuntimeConfigSnapshot;
  networkPolicy: string;
  maxRuntimeSeconds: number;
  customerOrganizationId: string;
  sensitivityClass: WorkloadSensitivityClass;
  createdAt: string;
}

export class WorkloadBundle {
  private constructor(
    public readonly id: string,
    public readonly modelManifestId: string,
    public readonly imageDigest: string,
    public readonly runtimeConfig: WorkloadRuntimeConfigSnapshot,
    public readonly networkPolicy: string,
    public readonly maxRuntimeSeconds: number,
    public readonly customerOrganizationId: OrganizationId,
    public readonly sensitivityClass: WorkloadSensitivityClass,
    public readonly createdAt: Date
  ) {}

  public static issue(input: {
    modelManifestId: string;
    imageDigest: string;
    runtimeConfig: WorkloadRuntimeConfigSnapshot;
    networkPolicy: string;
    maxRuntimeSeconds: number;
    customerOrganizationId: string;
    sensitivityClass?: WorkloadSensitivityClass;
    createdAt: Date;
  }): WorkloadBundle {
    return new WorkloadBundle(
      randomUUID(),
      this.parseModelManifestId(input.modelManifestId),
      this.parseImageDigest(input.imageDigest),
      this.parseRuntimeConfig(input.runtimeConfig),
      this.parseNetworkPolicy(input.networkPolicy),
      this.parseMaxRuntimeSeconds(input.maxRuntimeSeconds),
      OrganizationId.create(input.customerOrganizationId),
      input.sensitivityClass ?? "standard_business",
      input.createdAt
    );
  }

  public static rehydrate(input: {
    id: string;
    modelManifestId: string;
    imageDigest: string;
    runtimeConfig: WorkloadRuntimeConfigSnapshot;
    networkPolicy: string;
    maxRuntimeSeconds: number;
    customerOrganizationId: string;
    sensitivityClass: string;
    createdAt: Date;
  }): WorkloadBundle {
    return new WorkloadBundle(
      this.parseBundleId(input.id),
      this.parseModelManifestId(input.modelManifestId),
      this.parseImageDigest(input.imageDigest),
      this.parseRuntimeConfig(input.runtimeConfig),
      this.parseNetworkPolicy(input.networkPolicy),
      this.parseMaxRuntimeSeconds(input.maxRuntimeSeconds),
      OrganizationId.create(input.customerOrganizationId),
      this.parseSensitivityClass(input.sensitivityClass),
      input.createdAt
    );
  }

  public toSnapshot(): WorkloadBundleSnapshot {
    return {
      id: this.id,
      modelManifestId: this.modelManifestId,
      imageDigest: this.imageDigest,
      runtimeConfig: {
        ...this.runtimeConfig
      },
      networkPolicy: this.networkPolicy,
      maxRuntimeSeconds: this.maxRuntimeSeconds,
      customerOrganizationId: this.customerOrganizationId.value,
      sensitivityClass: this.sensitivityClass,
      createdAt: this.createdAt.toISOString()
    };
  }

  public toCanonicalPayload(): string {
    const snapshot = this.toSnapshot();

    return JSON.stringify({
      id: snapshot.id,
      modelManifestId: snapshot.modelManifestId,
      imageDigest: snapshot.imageDigest,
      runtimeConfig: {
        requestKind: snapshot.runtimeConfig.requestKind,
        streamingEnabled: snapshot.runtimeConfig.streamingEnabled,
        maxTokens: snapshot.runtimeConfig.maxTokens,
        temperature: snapshot.runtimeConfig.temperature,
        topP: snapshot.runtimeConfig.topP
      },
      networkPolicy: snapshot.networkPolicy,
      maxRuntimeSeconds: snapshot.maxRuntimeSeconds,
      customerOrganizationId: snapshot.customerOrganizationId,
      sensitivityClass: snapshot.sensitivityClass,
      createdAt: snapshot.createdAt
    });
  }

  private static parseBundleId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed
      )
    ) {
      throw new DomainValidationError(
        "Workload bundle ID must be a valid UUID."
      );
    }

    return trimmed;
  }

  private static parseModelManifestId(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Workload model manifest ID must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }

  private static parseImageDigest(rawValue: string): string {
    const trimmed = rawValue.trim().toLowerCase();

    if (!/^sha256:[a-f0-9]{64}$/.test(trimmed)) {
      throw new DomainValidationError(
        "Workload image digest must be a sha256 digest."
      );
    }

    return trimmed;
  }

  private static parseRuntimeConfig(config: {
    requestKind: string;
    streamingEnabled: boolean;
    maxTokens: number;
    temperature: number | null;
    topP: number | null;
  }): WorkloadRuntimeConfigSnapshot {
    if (config.requestKind !== "chat.completions") {
      throw new DomainValidationError(
        "Workload runtime request kind must be chat.completions."
      );
    }

    if (!Number.isInteger(config.maxTokens) || config.maxTokens < 1) {
      throw new DomainValidationError(
        "Workload max tokens must be a positive integer."
      );
    }

    if (config.maxTokens > 131_072) {
      throw new DomainValidationError(
        "Workload max tokens must be at most 131072."
      );
    }

    if (
      config.temperature !== null &&
      (config.temperature < 0 || config.temperature > 2)
    ) {
      throw new DomainValidationError(
        "Workload temperature must be between 0 and 2 when provided."
      );
    }

    if (config.topP !== null && (config.topP <= 0 || config.topP > 1)) {
      throw new DomainValidationError(
        "Workload top-p must be greater than 0 and at most 1 when provided."
      );
    }

    return {
      requestKind: config.requestKind,
      streamingEnabled: config.streamingEnabled,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topP: config.topP
    };
  }

  private static parseNetworkPolicy(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (trimmed.length < 3 || trimmed.length > 120) {
      throw new DomainValidationError(
        "Workload network policy must be between 3 and 120 characters."
      );
    }

    return trimmed;
  }

  private static parseMaxRuntimeSeconds(rawValue: number): number {
    if (!Number.isInteger(rawValue) || rawValue < 1 || rawValue > 3600) {
      throw new DomainValidationError(
        "Workload max runtime seconds must be an integer between 1 and 3600."
      );
    }

    return rawValue;
  }

  private static parseSensitivityClass(
    rawValue: string
  ): WorkloadSensitivityClass {
    if (rawValue !== "standard_business") {
      throw new DomainValidationError(
        "Unsupported workload sensitivity class."
      );
    }

    return rawValue;
  }
}
