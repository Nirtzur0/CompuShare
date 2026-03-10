import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { CreateGatewayBatchUseCase } from "../../../src/application/batch/CreateGatewayBatchUseCase.js";
import { GetGatewayBatchUseCase } from "../../../src/application/batch/GetGatewayBatchUseCase.js";
import { GetGatewayFileUseCase } from "../../../src/application/batch/GetGatewayFileUseCase.js";
import { RunGatewayBatchWorkerCycleUseCase } from "../../../src/application/batch/RunGatewayBatchWorkerCycleUseCase.js";
import { UploadGatewayFileUseCase } from "../../../src/application/batch/UploadGatewayFileUseCase.js";
import { AuthenticateGatewayApiKeyUseCase } from "../../../src/application/identity/AuthenticateGatewayApiKeyUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { StructuredConsoleAuditLog } from "../../../src/infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";

interface PgMemModule {
  Pool: new () => Pool;
}

describe("gateway batch workflow", () => {
  let pool: Pool;

  beforeAll(async () => {
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const pgAdapter = database.adapters.createPg() as unknown as PgMemModule;
    pool = new pgAdapter.Pool();

    await new IdentitySchemaInitializer(pool).ensureSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("uploads a file, creates a batch, runs the worker, and retrieves output and error files", async () => {
    const clock = () => new Date("2026-03-18T15:00:00.000Z");
    const repository = new PostgresIdentityRepository(pool, clock);
    const auditLog = new StructuredConsoleAuditLog();
    const organization = await new CreateOrganizationUseCase(
      repository,
      auditLog,
      clock
    ).execute({
      organizationName: "Batch Buyer",
      organizationSlug: "batch-buyer",
      founderEmail: "buyer@example.com",
      founderDisplayName: "Batch Buyer Owner",
      accountCapabilities: ["buyer"]
    });
    const apiKey = await new IssueOrganizationApiKeyUseCase(
      repository,
      repository,
      auditLog,
      clock,
      () => "csk_gateway_batch_test_secret_000000"
    ).execute({
      organizationId: organization.organization.id,
      actorUserId: organization.founder.userId,
      label: "Batch test key",
      environment: "development"
    });
    const authenticateGatewayApiKeyUseCase =
      new AuthenticateGatewayApiKeyUseCase(repository, auditLog, clock);
    const uploadGatewayFileUseCase = new UploadGatewayFileUseCase(
      authenticateGatewayApiKeyUseCase,
      repository,
      clock
    );
    const uploadedFile = await uploadGatewayFileUseCase.execute({
      authorizationHeader: `Bearer ${apiKey.secret}`,
      purpose: "batch",
      filename: "input.jsonl",
      mediaType: "application/jsonl",
      bytes: Buffer.byteLength(
        [
          JSON.stringify({
            custom_id: "embed-1",
            method: "POST",
            url: "/v1/embeddings",
            body: {
              model: "cheap-embed-v1",
              input: "hello world"
            }
          }),
          JSON.stringify({
            custom_id: "embed-2",
            method: "POST",
            url: "/v1/embeddings",
            body: {
              model: "cheap-embed-v1",
              input: "fail me"
            }
          })
        ].join("\n"),
        "utf8"
      ),
      content: [
        JSON.stringify({
          custom_id: "embed-1",
          method: "POST",
          url: "/v1/embeddings",
          body: {
            model: "cheap-embed-v1",
            input: "hello world"
          }
        }),
        JSON.stringify({
          custom_id: "embed-2",
          method: "POST",
          url: "/v1/embeddings",
          body: {
            model: "cheap-embed-v1",
            input: "fail me"
          }
        })
      ].join("\n")
    });
    const createGatewayBatchUseCase = new CreateGatewayBatchUseCase(
      authenticateGatewayApiKeyUseCase,
      repository,
      auditLog,
      clock
    );
    const createdBatch = await createGatewayBatchUseCase.execute({
      authorizationHeader: `Bearer ${apiKey.secret}`,
      inputFileId: uploadedFile.file.id,
      endpoint: "/v1/embeddings",
      completionWindow: "24h"
    });
    const runGatewayBatchWorkerCycleUseCase =
      new RunGatewayBatchWorkerCycleUseCase(
        {
          createGatewayFile: async (file) => repository.createGatewayFile(file),
          findGatewayFileById: async (fileId) =>
            repository.findGatewayFileById(fileId),
          createGatewayBatchJob: async (batch, items) =>
            repository.createGatewayBatchJob(batch, items),
          findGatewayBatchJobById: async (batchId) =>
            repository.findGatewayBatchJobById(batchId),
          listGatewayBatchItems: async (batchId) =>
            repository.listGatewayBatchItems(batchId),
          updateGatewayBatchStatus: async (input) =>
            repository.updateGatewayBatchStatus(input),
          markGatewayBatchItemCompleted: async (input) =>
            repository.markGatewayBatchItemCompleted(input),
          markGatewayBatchItemFailed: async (input) =>
            repository.markGatewayBatchItemFailed(input),
          markGatewayBatchItemCancelled: async (input) =>
            repository.markGatewayBatchItemCancelled(input),
          claimNextGatewayBatch: async () => {
            const batch = await repository.findGatewayBatchJobById(
              createdBatch.batch.id
            );

            if (batch?.status !== "validating") {
              return null;
            }

            await repository.updateGatewayBatchStatus({
              batchId: batch.id,
              status: "in_progress",
              inProgressAt: "2026-03-18T15:05:00.000Z"
            });

            return repository.findGatewayBatchJobById(batch.id);
          }
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
                  embedding: [0.1, 0.2, 0.3]
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
        auditLog,
        "00000000-0000-0000-0000-000000000001",
        () => new Date("2026-03-18T15:05:00.000Z")
      );

    const workerResponse = await runGatewayBatchWorkerCycleUseCase.execute();

    const getGatewayBatchUseCase = new GetGatewayBatchUseCase(
      authenticateGatewayApiKeyUseCase,
      repository
    );
    const finalizedBatch = await getGatewayBatchUseCase.execute({
      authorizationHeader: `Bearer ${apiKey.secret}`,
      batchId: createdBatch.batch.id
    });
    const getGatewayFileUseCase = new GetGatewayFileUseCase(
      authenticateGatewayApiKeyUseCase,
      repository
    );
    if (
      finalizedBatch.batch.outputFileId === null ||
      finalizedBatch.batch.errorFileId === null
    ) {
      throw new Error("Expected output and error files to be created.");
    }
    const outputFile = await getGatewayFileUseCase.execute({
      authorizationHeader: `Bearer ${apiKey.secret}`,
      fileId: finalizedBatch.batch.outputFileId
    });
    const errorFile = await getGatewayFileUseCase.execute({
      authorizationHeader: `Bearer ${apiKey.secret}`,
      fileId: finalizedBatch.batch.errorFileId
    });

    expect(workerResponse).toEqual({
      processedBatchId: createdBatch.batch.id
    });
    expect(finalizedBatch.batch.status).toBe("completed");
    expect(finalizedBatch.batch.requestCounts.total).toBe(2);
    expect(outputFile.content).toContain('"custom_id":"embed-1"');
    expect(outputFile.content).toContain('"embedding":[0.1,0.2,0.3]');
    expect(errorFile.content).toContain('"custom_id":"embed-2"');
    expect(errorFile.content).toContain("Embedding dispatch failed.");
  });
});
