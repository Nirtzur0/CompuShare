import { describe, expect, it } from "vitest";
import { RunGatewayBatchWorkerCycleUseCase } from "../../../src/application/batch/RunGatewayBatchWorkerCycleUseCase.js";
import { GatewayBatchJob } from "../../../src/domain/batch/GatewayBatchJob.js";
import { GatewayBatchJobItem } from "../../../src/domain/batch/GatewayBatchJobItem.js";
import type { GatewayFile } from "../../../src/domain/batch/GatewayFile.js";

function createBatch(
  status: "validating" | "in_progress" | "cancelling" = "validating"
) {
  return GatewayBatchJob.rehydrate({
    id: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
    organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
    environment: "development",
    inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
    outputFileId: null,
    errorFileId: null,
    endpoint: "/v1/embeddings",
    completionWindow: "24h",
    status,
    createdByUserId: "user-1",
    createdAt: new Date("2026-03-18T09:00:00.000Z"),
    inProgressAt:
      status === "in_progress" ? new Date("2026-03-18T09:01:00.000Z") : null,
    completedAt: null,
    requestCounts: {
      total: 2,
      completed: 0,
      failed: 0
    }
  });
}

describe("RunGatewayBatchWorkerCycleUseCase", () => {
  it("processes batch items, writes output and error files, and finalizes the batch", async () => {
    const createdFiles: GatewayFile[] = [];
    const statusUpdates: {
      status: string;
      outputFileId?: string | null;
      errorFileId?: string | null;
    }[] = [];
    const completedOrdinals: number[] = [];
    const failedOrdinals: number[] = [];
    const auditEvents: string[] = [];
    let batchState = createBatch("validating");
    const items = [
      GatewayBatchJobItem.create({
        batchId: batchState.id,
        ordinal: 0,
        customId: "embed-1",
        method: "POST",
        endpoint: "/v1/embeddings",
        body: {
          model: "cheap-embed-v1",
          input: "hello"
        }
      }),
      GatewayBatchJobItem.create({
        batchId: batchState.id,
        ordinal: 1,
        customId: "embed-2",
        method: "POST",
        endpoint: "/v1/embeddings",
        body: {
          model: "cheap-embed-v1",
          input: "fail me"
        }
      })
    ];

    const useCase = new RunGatewayBatchWorkerCycleUseCase(
      {
        claimNextGatewayBatch: () => {
          if (batchState.status !== "validating") {
            return Promise.resolve(null);
          }

          batchState = GatewayBatchJob.rehydrate({
            ...batchState.toSnapshot(),
            status: "in_progress",
            createdAt: batchState.createdAt,
            inProgressAt: new Date("2026-03-18T09:02:00.000Z"),
            completedAt: null
          });
          return Promise.resolve(batchState);
        },
        listGatewayBatchItems: () => Promise.resolve(items),
        findGatewayBatchJobById: () => Promise.resolve(batchState),
        updateGatewayBatchStatus: (input) => {
          statusUpdates.push(input);
          batchState = GatewayBatchJob.rehydrate({
            ...batchState.toSnapshot(),
            status: input.status,
            outputFileId:
              input.outputFileId === undefined
                ? batchState.outputFileId
                : input.outputFileId,
            errorFileId:
              input.errorFileId === undefined
                ? batchState.errorFileId
                : input.errorFileId,
            createdAt: batchState.createdAt,
            inProgressAt:
              input.inProgressAt === undefined
                ? batchState.inProgressAt
                : input.inProgressAt === null
                  ? null
                  : new Date(input.inProgressAt),
            completedAt:
              input.completedAt === undefined
                ? batchState.completedAt
                : input.completedAt === null
                  ? null
                  : new Date(input.completedAt)
          });
          return Promise.resolve();
        },
        markGatewayBatchItemCompleted: (input) => {
          completedOrdinals.push(input.ordinal);
          return Promise.resolve();
        },
        markGatewayBatchItemFailed: (input) => {
          failedOrdinals.push(input.ordinal);
          return Promise.resolve();
        },
        markGatewayBatchItemCancelled: () => Promise.resolve(),
        createGatewayFile: (file) => {
          createdFiles.push(file);
          return Promise.resolve();
        },
        findGatewayFileById: () => Promise.resolve(null),
        createGatewayBatchJob: () => Promise.resolve(),
        countActiveGatewayBatches: () => Promise.resolve(0)
      },
      {
        executeAuthenticated: () =>
          Promise.reject(new Error("unused chat path"))
      },
      {
        executeAuthenticated: (input) => {
          if (input.request.input === "fail me") {
            return Promise.reject(new Error("Embedding dispatch failed."));
          }

          return Promise.resolve({
            object: "list",
            data: [
              {
                object: "embedding",
                index: 0,
                embedding: [0.1, 0.2]
              }
            ],
            model: input.request.model,
            usage: {
              prompt_tokens: 2,
              total_tokens: 2
            }
          });
        }
      },
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      "00000000-0000-0000-0000-000000000001",
      () => new Date("2026-03-18T09:03:00.000Z")
    );

    const response = await useCase.execute();

    expect(response).toEqual({
      processedBatchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
    });
    expect(completedOrdinals).toEqual([0]);
    expect(failedOrdinals).toEqual([1]);
    expect(createdFiles).toHaveLength(2);
    expect(createdFiles[0]?.filename).toContain("-output.jsonl");
    expect(createdFiles[1]?.filename).toContain("-errors.jsonl");
    expect(statusUpdates.at(-1)).toMatchObject({
      status: "completed"
    });
    expect(auditEvents).toEqual(["gateway.batch.completed"]);
  });

  it("returns null when no batch is pending", async () => {
    const useCase = new RunGatewayBatchWorkerCycleUseCase(
      {
        claimNextGatewayBatch: () => Promise.resolve(null),
        listGatewayBatchItems: () => Promise.resolve([]),
        findGatewayBatchJobById: () => Promise.resolve(null),
        updateGatewayBatchStatus: () => Promise.resolve(),
        markGatewayBatchItemCompleted: () => Promise.resolve(),
        markGatewayBatchItemFailed: () => Promise.resolve(),
        markGatewayBatchItemCancelled: () => Promise.resolve(),
        createGatewayFile: () => Promise.resolve(),
        findGatewayFileById: () => Promise.resolve(null),
        createGatewayBatchJob: () => Promise.resolve(),
        countActiveGatewayBatches: () => Promise.resolve(0)
      },
      {
        executeAuthenticated: () => Promise.reject(new Error("unused"))
      },
      {
        executeAuthenticated: () => Promise.reject(new Error("unused"))
      },
      {
        record: () => Promise.resolve()
      }
    );

    await expect(useCase.execute()).resolves.toEqual({
      processedBatchId: null
    });
  });

  it("cancels remaining items when a batch enters cancelling during processing", async () => {
    const cancelledOrdinals: number[] = [];
    const statusUpdates: string[] = [];
    const createdFiles: GatewayFile[] = [];
    const auditEvents: string[] = [];
    let findCount = 0;
    let batchState = createBatch("validating");
    const items = [
      GatewayBatchJobItem.create({
        batchId: batchState.id,
        ordinal: 0,
        customId: "chat-1",
        method: "POST",
        endpoint: "/v1/chat/completions",
        body: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      }),
      GatewayBatchJobItem.create({
        batchId: batchState.id,
        ordinal: 1,
        customId: "embed-2",
        method: "POST",
        endpoint: "/v1/embeddings",
        body: {
          model: "cheap-embed-v1",
          input: "Hello"
        }
      })
    ];

    const useCase = new RunGatewayBatchWorkerCycleUseCase(
      {
        claimNextGatewayBatch: () => {
          if (batchState.status !== "validating") {
            return Promise.resolve(null);
          }

          batchState = GatewayBatchJob.rehydrate({
            ...batchState.toSnapshot(),
            status: "in_progress",
            createdAt: batchState.createdAt,
            inProgressAt: new Date("2026-03-18T09:02:00.000Z"),
            completedAt: null
          });
          return Promise.resolve(batchState);
        },
        listGatewayBatchItems: () => Promise.resolve(items),
        findGatewayBatchJobById: () => {
          findCount += 1;
          if (findCount > 1) {
            batchState = GatewayBatchJob.rehydrate({
              ...batchState.toSnapshot(),
              status: "cancelling",
              createdAt: batchState.createdAt,
              inProgressAt: batchState.inProgressAt,
              completedAt: null
            });
          }
          return Promise.resolve(batchState);
        },
        updateGatewayBatchStatus: (input) => {
          statusUpdates.push(input.status);
          batchState = GatewayBatchJob.rehydrate({
            ...batchState.toSnapshot(),
            status: input.status,
            outputFileId:
              input.outputFileId === undefined
                ? batchState.outputFileId
                : input.outputFileId,
            errorFileId:
              input.errorFileId === undefined
                ? batchState.errorFileId
                : input.errorFileId,
            createdAt: batchState.createdAt,
            inProgressAt:
              input.inProgressAt === undefined
                ? batchState.inProgressAt
                : input.inProgressAt === null
                  ? null
                  : new Date(input.inProgressAt),
            completedAt:
              input.completedAt === undefined
                ? batchState.completedAt
                : input.completedAt === null
                  ? null
                  : new Date(input.completedAt)
          });
          return Promise.resolve();
        },
        markGatewayBatchItemCompleted: () => Promise.resolve(),
        markGatewayBatchItemFailed: () => Promise.resolve(),
        markGatewayBatchItemCancelled: (input) => {
          cancelledOrdinals.push(input.ordinal);
          return Promise.resolve();
        },
        createGatewayFile: (file) => {
          createdFiles.push(file);
          return Promise.resolve();
        },
        findGatewayFileById: () => Promise.resolve(null),
        createGatewayBatchJob: () => Promise.resolve(),
        countActiveGatewayBatches: () => Promise.resolve(0)
      },
      {
        executeAuthenticated: () =>
          Promise.resolve({
            id: "chatcmpl_123",
            object: "chat.completion",
            created: 1_773_624_000,
            model: "openai/gpt-oss-120b-like",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "Hello"
                }
              }
            ],
            usage: {
              prompt_tokens: 3,
              completion_tokens: 2,
              total_tokens: 5
            }
          })
      },
      {
        executeAuthenticated: () => Promise.reject(new Error("should not run"))
      },
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      "00000000-0000-0000-0000-000000000001",
      () => new Date("2026-03-18T09:03:00.000Z")
    );

    await expect(useCase.execute()).resolves.toEqual({
      processedBatchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
    });
    expect(cancelledOrdinals).toEqual([1]);
    expect(statusUpdates.at(-1)).toBe("cancelled");
    expect(createdFiles).toHaveLength(1);
    expect(createdFiles[0]?.filename).toContain("-output.jsonl");
    expect(auditEvents).toEqual(["gateway.batch.completed"]);
  });
});
