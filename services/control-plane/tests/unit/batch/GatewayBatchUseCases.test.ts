import { describe, expect, it } from "vitest";
import { CreateGatewayBatchUseCase } from "../../../src/application/batch/CreateGatewayBatchUseCase.js";
import { CancelGatewayBatchUseCase } from "../../../src/application/batch/CancelGatewayBatchUseCase.js";
import { GetGatewayBatchUseCase } from "../../../src/application/batch/GetGatewayBatchUseCase.js";
import { GetGatewayFileUseCase } from "../../../src/application/batch/GetGatewayFileUseCase.js";
import { UploadGatewayFileUseCase } from "../../../src/application/batch/UploadGatewayFileUseCase.js";
import { GatewayBatchJob } from "../../../src/domain/batch/GatewayBatchJob.js";
import { GatewayFile } from "../../../src/domain/batch/GatewayFile.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";

const authentication = {
  scope: {
    organizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
    environment: "development" as const
  },
  apiKey: {
    id: "api-key-1",
    issuedByUserId: "user-1"
  }
};

function createFile(
  overrides?: Partial<{
    organizationId: string;
    environment: string;
    content: string;
  }>
) {
  return GatewayFile.rehydrate({
    id: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
    organizationId:
      overrides?.organizationId ?? "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
    environment: overrides?.environment ?? "development",
    purpose: "batch",
    filename: "input.jsonl",
    mediaType: "application/jsonl",
    bytes: Buffer.byteLength(overrides?.content ?? "{}", "utf8"),
    content:
      overrides?.content ??
      '{"custom_id":"item-1","method":"POST","url":"/v1/embeddings","body":{"model":"cheap-embed-v1","input":"hello"}}',
    createdByUserId: "user-1",
    createdAt: new Date("2026-03-18T09:00:00.000Z")
  });
}

function createBatch(
  status: "validating" | "in_progress" | "completed" = "validating"
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
    completedAt:
      status === "completed" ? new Date("2026-03-18T09:03:00.000Z") : null,
    requestCounts: {
      total: 1,
      completed: status === "completed" ? 1 : 0,
      failed: 0
    }
  });
}

describe("Gateway batch use cases", () => {
  it("rejects malformed bearer headers across file and batch use cases", async () => {
    const uploadUseCase = new UploadGatewayFileUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        createGatewayFile: () => Promise.resolve()
      } as never
    );

    const createBatchUseCase = new CreateGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayFileById: () => Promise.resolve(createFile()),
        createGatewayFile: () => Promise.resolve(),
        createGatewayBatchJob: () => Promise.resolve(),
        findGatewayBatchJobById: () => Promise.resolve(null)
      } as never,
      { record: () => Promise.resolve() }
    );

    const getFileUseCase = new GetGatewayFileUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayFileById: () => Promise.resolve(createFile())
      } as never
    );

    const getBatchUseCase = new GetGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayBatchJobById: () => Promise.resolve(createBatch())
      } as never
    );

    const cancelBatchUseCase = new CancelGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayBatchJobById: () => Promise.resolve(createBatch()),
        updateGatewayBatchStatus: () => Promise.resolve()
      } as never,
      { record: () => Promise.resolve() }
    );

    await expect(
      uploadUseCase.execute({
        authorizationHeader: "Token nope",
        purpose: "batch",
        filename: "input.jsonl",
        mediaType: "application/jsonl",
        bytes: 4,
        content: "{}"
      })
    ).rejects.toThrow("Authorization: Bearer");
    await expect(
      createBatchUseCase.execute({
        authorizationHeader: "Token nope",
        inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        endpoint: "/v1/embeddings",
        completionWindow: "24h"
      })
    ).rejects.toThrow("Authorization: Bearer");
    await expect(
      getFileUseCase.execute({
        authorizationHeader: "Token nope",
        fileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da"
      })
    ).rejects.toThrow("Authorization: Bearer");
    await expect(
      getBatchUseCase.execute({
        authorizationHeader: "Token nope",
        batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
      })
    ).rejects.toThrow("Authorization: Bearer");
    await expect(
      cancelBatchUseCase.execute({
        authorizationHeader: "Token nope",
        batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
      })
    ).rejects.toThrow("Authorization: Bearer");
  });

  it("fails batch creation with an error file when jsonl validation fails", async () => {
    const createdFiles: GatewayFile[] = [];
    const createdBatches: { status: string; itemCount: number }[] = [];
    const auditEvents: string[] = [];
    let storedBatch: GatewayBatchJob | null = null;
    const useCase = new CreateGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayFileById: () =>
          Promise.resolve(
            createFile({
              content: [
                '{"custom_id":"ok","method":"POST","url":"/v1/embeddings","body":{"model":"cheap-embed-v1","input":"hello"}}',
                '{"custom_id":"bad","method":"GET","url":"/v1/embeddings","body":{}}'
              ].join("\n")
            })
          ),
        createGatewayFile: (file: GatewayFile) => {
          createdFiles.push(file);
          return Promise.resolve();
        },
        createGatewayBatchJob: (
          batch: GatewayBatchJob,
          items: readonly unknown[]
        ) => {
          createdBatches.push({
            status: batch.status,
            itemCount: items.length
          });
          storedBatch = GatewayBatchJob.rehydrate({
            ...batch.toSnapshot(),
            status: "failed",
            outputFileId: null,
            errorFileId: createdFiles[0]?.id ?? null,
            createdAt: new Date(batch.toSnapshot().createdAt),
            inProgressAt: null,
            completedAt: new Date("2026-03-18T09:00:00.000Z")
          });
          return Promise.resolve();
        },
        findGatewayBatchJobById: () => Promise.resolve(storedBatch)
      } as never,
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      () => new Date("2026-03-18T09:00:00.000Z")
    );

    const response = await useCase.execute({
      authorizationHeader: "Bearer csk_gateway_secret_value_000000",
      inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
      endpoint: "/v1/embeddings",
      completionWindow: "24h"
    });

    expect(response.batch.status).toBe("failed");
    expect(createdFiles).toHaveLength(1);
    expect(createdFiles[0]?.filename).toContain("-errors.jsonl");
    expect(createdFiles[0]?.content).toContain("Each JSONL line must contain");
    expect(createdBatches).toEqual([{ status: "failed", itemCount: 0 }]);
    expect(auditEvents).toEqual(["gateway.batch.failed"]);
  });

  it("rejects batch creation when the input file is outside the authenticated scope", async () => {
    const useCase = new CreateGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayFileById: () =>
          Promise.resolve(createFile({ environment: "production" })),
        createGatewayFile: () => Promise.resolve(),
        createGatewayBatchJob: () => Promise.resolve(),
        findGatewayBatchJobById: () => Promise.resolve(null)
      } as never,
      {
        record: () => Promise.resolve()
      }
    );

    await expect(
      useCase.execute({
        authorizationHeader: "Bearer csk_gateway_secret_value_000000",
        inputFileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da",
        endpoint: "/v1/embeddings",
        completionWindow: "24h"
      })
    ).rejects.toThrow("was not found");
  });

  it("rejects gateway file and batch reads outside the authenticated scope", async () => {
    const getFileUseCase = new GetGatewayFileUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayFileById: () =>
          Promise.resolve(
            createFile({
              organizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4"
            })
          )
      } as never
    );
    const getBatchUseCase = new GetGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayBatchJobById: () =>
          Promise.resolve(
            GatewayBatchJob.rehydrate({
              ...createBatch().toSnapshot(),
              organizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
              createdAt: new Date("2026-03-18T09:00:00.000Z"),
              inProgressAt: null,
              completedAt: null
            })
          )
      } as never
    );

    await expect(
      getFileUseCase.execute({
        authorizationHeader: "Bearer csk_gateway_secret_value_000000",
        fileId: "dcbb9c3d-6cf9-4235-a553-110691ecf3da"
      })
    ).rejects.toThrow("was not found");
    await expect(
      getBatchUseCase.execute({
        authorizationHeader: "Bearer csk_gateway_secret_value_000000",
        batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
      })
    ).rejects.toThrow("was not found");
  });

  it("transitions validating batches directly to cancelled and leaves completed batches unchanged", async () => {
    const statusUpdates: { status: string; completedAt?: string }[] = [];
    const auditEvents: string[] = [];
    let validatingBatch = createBatch("validating");
    const cancelValidatingUseCase = new CancelGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayBatchJobById: () => Promise.resolve(validatingBatch),
        updateGatewayBatchStatus: (input: {
          status: string;
          completedAt?: string;
        }) => {
          statusUpdates.push(input);
          validatingBatch = GatewayBatchJob.rehydrate({
            ...validatingBatch.toSnapshot(),
            status: "cancelled",
            createdAt: validatingBatch.createdAt,
            inProgressAt: validatingBatch.inProgressAt,
            completedAt: new Date(
              input.completedAt ?? "2026-03-18T09:04:00.000Z"
            )
          });
          return Promise.resolve();
        }
      } as never,
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      () => new Date("2026-03-18T09:04:00.000Z")
    );

    const cancelled = await cancelValidatingUseCase.execute({
      authorizationHeader: "Bearer csk_gateway_secret_value_000000",
      batchId: validatingBatch.id
    });
    expect(cancelled.batch.status).toBe("cancelled");
    expect(statusUpdates).toEqual([
      {
        batchId: validatingBatch.id,
        status: "cancelled",
        completedAt: "2026-03-18T09:04:00.000Z"
      }
    ]);
    expect(auditEvents).toEqual(["gateway.batch.cancel_requested"]);

    const cancelCompletedUseCase = new CancelGatewayBatchUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        findGatewayBatchJobById: () =>
          Promise.resolve(createBatch("completed")),
        updateGatewayBatchStatus: () => {
          throw new Error("should not update completed batch");
        }
      } as never,
      {
        record: () => {
          throw new Error("should not audit completed batch");
        }
      }
    );

    const completed = await cancelCompletedUseCase.execute({
      authorizationHeader: "Bearer csk_gateway_secret_value_000000",
      batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
    });
    expect(completed.batch.status).toBe("completed");
  });

  it("validates uploaded gateway files through the domain object", async () => {
    const useCase = new UploadGatewayFileUseCase(
      {
        execute: () => Promise.resolve(authentication)
      } as never,
      {
        createGatewayFile: () => Promise.resolve()
      } as never
    );

    await expect(
      useCase.execute({
        authorizationHeader: "Bearer csk_gateway_secret_value_000000",
        purpose: "batch",
        filename: "input.jsonl",
        mediaType: "application/jsonl",
        bytes: 1,
        content: ""
      })
    ).rejects.toThrow(DomainValidationError);
  });
});
