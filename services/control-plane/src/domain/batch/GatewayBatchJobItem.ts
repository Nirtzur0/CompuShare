import { DomainValidationError } from "../identity/DomainValidationError.js";
import type { GatewayBatchEndpoint } from "./GatewayBatchJob.js";

export type GatewayBatchItemStatus =
  | "pending"
  | "completed"
  | "failed"
  | "cancelled";

export interface GatewayBatchJobItemSnapshot {
  batchId: string;
  ordinal: number;
  customId: string;
  method: "POST";
  endpoint: GatewayBatchEndpoint;
  body: Record<string, unknown>;
  status: GatewayBatchItemStatus;
  responseBody: Record<string, unknown> | null;
  errorBody: Record<string, unknown> | null;
  completedAt: string | null;
}

export class GatewayBatchJobItem {
  private constructor(
    public readonly batchId: string,
    public readonly ordinal: number,
    public readonly customId: string,
    public readonly method: "POST",
    public readonly endpoint: GatewayBatchEndpoint,
    public readonly body: Record<string, unknown>,
    public readonly status: GatewayBatchItemStatus,
    public readonly responseBody: Record<string, unknown> | null,
    public readonly errorBody: Record<string, unknown> | null,
    public readonly completedAt: Date | null
  ) {}

  public static create(input: {
    batchId: string;
    ordinal: number;
    customId: string;
    method: "POST";
    endpoint: GatewayBatchEndpoint;
    body: Record<string, unknown>;
  }): GatewayBatchJobItem {
    return new GatewayBatchJobItem(
      input.batchId,
      this.parseOrdinal(input.ordinal),
      this.parseCustomId(input.customId),
      "POST",
      input.endpoint,
      input.body,
      "pending",
      null,
      null,
      null
    );
  }

  public static rehydrate(input: {
    batchId: string;
    ordinal: number;
    customId: string;
    method: "POST";
    endpoint: GatewayBatchEndpoint;
    body: Record<string, unknown>;
    status: GatewayBatchItemStatus;
    responseBody: Record<string, unknown> | null;
    errorBody: Record<string, unknown> | null;
    completedAt: Date | null;
  }): GatewayBatchJobItem {
    return new GatewayBatchJobItem(
      input.batchId,
      this.parseOrdinal(input.ordinal),
      this.parseCustomId(input.customId),
      "POST",
      input.endpoint,
      input.body,
      this.parseStatus(input.status),
      input.responseBody,
      input.errorBody,
      input.completedAt
    );
  }

  public toSnapshot(): GatewayBatchJobItemSnapshot {
    return {
      batchId: this.batchId,
      ordinal: this.ordinal,
      customId: this.customId,
      method: this.method,
      endpoint: this.endpoint,
      body: this.body,
      status: this.status,
      responseBody: this.responseBody,
      errorBody: this.errorBody,
      completedAt: this.completedAt?.toISOString() ?? null
    };
  }

  private static parseOrdinal(value: number): number {
    if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
      throw new DomainValidationError(
        "Gateway batch item ordinal must be a non-negative integer."
      );
    }
    return value;
  }

  private static parseCustomId(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      throw new DomainValidationError(
        "Gateway batch item custom_id must be between 1 and 200 characters."
      );
    }
    return trimmed;
  }

  private static parseStatus(value: string): GatewayBatchItemStatus {
    if (
      value !== "pending" &&
      value !== "completed" &&
      value !== "failed" &&
      value !== "cancelled"
    ) {
      throw new DomainValidationError("Gateway batch item status is invalid.");
    }
    return value;
  }
}
