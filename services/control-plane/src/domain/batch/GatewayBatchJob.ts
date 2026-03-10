import { randomUUID } from "node:crypto";
import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";
import {
  parseOrganizationApiKeyEnvironment,
  type OrganizationApiKeyEnvironment
} from "../identity/OrganizationApiKeyEnvironment.js";

export type GatewayBatchEndpoint = "/v1/chat/completions" | "/v1/embeddings";
export type GatewayBatchStatus =
  | "validating"
  | "in_progress"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelling"
  | "cancelled";

export interface GatewayBatchCounts {
  total: number;
  completed: number;
  failed: number;
}

export interface GatewayBatchJobSnapshot {
  id: string;
  organizationId: string;
  environment: OrganizationApiKeyEnvironment;
  inputFileId: string;
  outputFileId: string | null;
  errorFileId: string | null;
  endpoint: GatewayBatchEndpoint;
  completionWindow: "24h";
  status: GatewayBatchStatus;
  createdByUserId: string;
  createdAt: string;
  inProgressAt: string | null;
  completedAt: string | null;
  requestCounts: GatewayBatchCounts;
}

export class GatewayBatchJob {
  private constructor(
    public readonly id: string,
    public readonly organizationId: OrganizationId,
    public readonly environment: OrganizationApiKeyEnvironment,
    public readonly inputFileId: string,
    public readonly outputFileId: string | null,
    public readonly errorFileId: string | null,
    public readonly endpoint: GatewayBatchEndpoint,
    public readonly completionWindow: "24h",
    public readonly status: GatewayBatchStatus,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public readonly inProgressAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly requestCounts: GatewayBatchCounts
  ) {}

  public static create(input: {
    organizationId: string;
    environment: string;
    inputFileId: string;
    endpoint: GatewayBatchEndpoint;
    completionWindow: "24h";
    createdByUserId: string;
    createdAt: Date;
    requestCounts: GatewayBatchCounts;
  }): GatewayBatchJob {
    return new GatewayBatchJob(
      randomUUID(),
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      input.inputFileId,
      null,
      null,
      this.parseEndpoint(input.endpoint),
      input.completionWindow,
      "validating",
      input.createdByUserId.trim(),
      input.createdAt,
      null,
      null,
      this.parseCounts(input.requestCounts)
    );
  }

  public static rehydrate(input: {
    id: string;
    organizationId: string;
    environment: string;
    inputFileId: string;
    outputFileId: string | null;
    errorFileId: string | null;
    endpoint: GatewayBatchEndpoint;
    completionWindow: "24h";
    status: GatewayBatchStatus;
    createdByUserId: string;
    createdAt: Date;
    inProgressAt: Date | null;
    completedAt: Date | null;
    requestCounts: GatewayBatchCounts;
  }): GatewayBatchJob {
    return new GatewayBatchJob(
      input.id,
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      input.inputFileId,
      input.outputFileId,
      input.errorFileId,
      this.parseEndpoint(input.endpoint),
      input.completionWindow,
      this.parseStatus(input.status),
      input.createdByUserId.trim(),
      input.createdAt,
      input.inProgressAt,
      input.completedAt,
      this.parseCounts(input.requestCounts)
    );
  }

  public toSnapshot(): GatewayBatchJobSnapshot {
    return {
      id: this.id,
      organizationId: this.organizationId.value,
      environment: this.environment,
      inputFileId: this.inputFileId,
      outputFileId: this.outputFileId,
      errorFileId: this.errorFileId,
      endpoint: this.endpoint,
      completionWindow: this.completionWindow,
      status: this.status,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt.toISOString(),
      inProgressAt: this.inProgressAt?.toISOString() ?? null,
      completedAt: this.completedAt?.toISOString() ?? null,
      requestCounts: { ...this.requestCounts }
    };
  }

  private static parseEndpoint(value: string): GatewayBatchEndpoint {
    if (value !== "/v1/chat/completions" && value !== "/v1/embeddings") {
      throw new DomainValidationError(
        "Gateway batch endpoints must be /v1/chat/completions or /v1/embeddings."
      );
    }
    return value;
  }

  private static parseStatus(value: string): GatewayBatchStatus {
    if (
      value !== "validating" &&
      value !== "in_progress" &&
      value !== "finalizing" &&
      value !== "completed" &&
      value !== "failed" &&
      value !== "cancelling" &&
      value !== "cancelled"
    ) {
      throw new DomainValidationError("Gateway batch status is invalid.");
    }
    return value;
  }

  private static parseCounts(value: GatewayBatchCounts): GatewayBatchCounts {
    if (
      !Number.isInteger(value.total) ||
      !Number.isInteger(value.completed) ||
      !Number.isInteger(value.failed) ||
      value.total < 0 ||
      value.completed < 0 ||
      value.failed < 0 ||
      value.completed + value.failed > value.total
    ) {
      throw new DomainValidationError(
        "Gateway batch request counts are invalid."
      );
    }
    return { ...value };
  }
}
