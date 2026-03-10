import { describe, expect, it } from "vitest";
import { GatewayBatchJob } from "../../../src/domain/batch/GatewayBatchJob.js";
import { GatewayBatchJobItem } from "../../../src/domain/batch/GatewayBatchJobItem.js";
import { GatewayFile } from "../../../src/domain/batch/GatewayFile.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";

describe("Gateway batch domain objects", () => {
  it("rejects invalid gateway file attributes", () => {
    expect(() =>
      GatewayFile.upload({
        organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        environment: "development",
        purpose: "batch",
        filename: " ",
        mediaType: "application/jsonl",
        bytes: 10,
        content: "line",
        createdByUserId: "user-1",
        createdAt: new Date("2026-03-18T09:00:00.000Z")
      })
    ).toThrowError(DomainValidationError);

    expect(() =>
      GatewayFile.upload({
        organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        environment: "development",
        purpose: "batch",
        filename: "input.jsonl",
        mediaType: "x",
        bytes: 10,
        content: "line",
        createdByUserId: "user-1",
        createdAt: new Date("2026-03-18T09:00:00.000Z")
      })
    ).toThrowError(DomainValidationError);

    expect(() =>
      GatewayFile.upload({
        organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        environment: "development",
        purpose: "batch",
        filename: "input.jsonl",
        mediaType: "application/jsonl",
        bytes: 0,
        content: "line",
        createdByUserId: "user-1",
        createdAt: new Date("2026-03-18T09:00:00.000Z")
      })
    ).toThrowError(DomainValidationError);

    expect(() =>
      GatewayFile.upload({
        organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        environment: "development",
        purpose: "batch",
        filename: "input.jsonl",
        mediaType: "application/jsonl",
        bytes: 10,
        content: "",
        createdByUserId: "user-1",
        createdAt: new Date("2026-03-18T09:00:00.000Z")
      })
    ).toThrowError(DomainValidationError);
  });

  it("rejects invalid batch job states and counts", () => {
    expect(() =>
      GatewayBatchJob.rehydrate({
        id: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
        organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        environment: "development",
        inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        outputFileId: null,
        errorFileId: null,
        endpoint: "/v1/other" as "/v1/chat/completions",
        completionWindow: "24h",
        status: "validating",
        createdByUserId: "user-1",
        createdAt: new Date("2026-03-18T09:00:00.000Z"),
        inProgressAt: null,
        completedAt: null,
        requestCounts: { total: 1, completed: 0, failed: 0 }
      })
    ).toThrowError(DomainValidationError);

    expect(() =>
      GatewayBatchJob.rehydrate({
        id: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
        organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        environment: "development",
        inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        outputFileId: null,
        errorFileId: null,
        endpoint: "/v1/embeddings",
        completionWindow: "24h",
        status: "invalid" as "validating",
        createdByUserId: "user-1",
        createdAt: new Date("2026-03-18T09:00:00.000Z"),
        inProgressAt: null,
        completedAt: null,
        requestCounts: { total: 1, completed: 0, failed: 0 }
      })
    ).toThrowError(DomainValidationError);

    expect(() =>
      GatewayBatchJob.rehydrate({
        id: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
        organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        environment: "development",
        inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        outputFileId: null,
        errorFileId: null,
        endpoint: "/v1/embeddings",
        completionWindow: "24h",
        status: "validating",
        createdByUserId: "user-1",
        createdAt: new Date("2026-03-18T09:00:00.000Z"),
        inProgressAt: null,
        completedAt: null,
        requestCounts: { total: 1, completed: 1, failed: 1 }
      })
    ).toThrowError(DomainValidationError);
  });

  it("rejects invalid batch item attributes", () => {
    expect(() =>
      GatewayBatchJobItem.create({
        batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
        ordinal: -1,
        customId: "embed-1",
        method: "POST",
        endpoint: "/v1/embeddings",
        body: { model: "cheap-embed-v1", input: "hello" }
      })
    ).toThrowError(DomainValidationError);

    expect(() =>
      GatewayBatchJobItem.create({
        batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
        ordinal: 0,
        customId: " ",
        method: "POST",
        endpoint: "/v1/embeddings",
        body: { model: "cheap-embed-v1", input: "hello" }
      })
    ).toThrowError(DomainValidationError);

    expect(() =>
      GatewayBatchJobItem.rehydrate({
        batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
        ordinal: 0,
        customId: "embed-1",
        method: "POST",
        endpoint: "/v1/embeddings",
        body: { model: "cheap-embed-v1", input: "hello" },
        status: "broken" as "pending",
        responseBody: null,
        errorBody: null,
        completedAt: null
      })
    ).toThrowError(DomainValidationError);
  });
});
