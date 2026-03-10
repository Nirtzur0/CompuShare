import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { AuthenticateGatewayApiKeyUseCase } from "../identity/AuthenticateGatewayApiKeyUseCase.js";
import { GatewayBatchJob } from "../../domain/batch/GatewayBatchJob.js";
import { GatewayBatchJobItem } from "../../domain/batch/GatewayBatchJobItem.js";
import { GatewayFile } from "../../domain/batch/GatewayFile.js";
import { GatewayFileNotFoundError } from "./GetGatewayFileUseCase.js";
import type { GatewayBatchRepository } from "./ports/GatewayBatchRepository.js";

export class CreateGatewayBatchUseCase {
  public constructor(
    private readonly authenticateGatewayApiKeyUseCase: AuthenticateGatewayApiKeyUseCase,
    private readonly repository: GatewayBatchRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(input: {
    authorizationHeader: string;
    inputFileId: string;
    endpoint: "/v1/chat/completions" | "/v1/embeddings";
    completionWindow: "24h";
  }) {
    const authentication = await this.authenticateGatewayApiKeyUseCase.execute({
      secret: this.parseAuthorizationHeader(input.authorizationHeader)
    });
    const file = await this.repository.findGatewayFileById(input.inputFileId);

    if (
      file?.organizationId.value !== authentication.scope.organizationId ||
      file.environment !== authentication.scope.environment
    ) {
      throw new GatewayFileNotFoundError(input.inputFileId);
    }

    const occurredAt = this.clock();
    const parsedItems = this.parseBatchItems(file, input.endpoint);
    const requestCountTotal =
      "errorBody" in parsedItems ? 0 : parsedItems.length;
    const batch = GatewayBatchJob.create({
      organizationId: authentication.scope.organizationId,
      environment: authentication.scope.environment,
      inputFileId: file.id,
      endpoint: input.endpoint,
      completionWindow: input.completionWindow,
      createdByUserId: authentication.apiKey.issuedByUserId,
      createdAt: occurredAt,
      requestCounts: {
        total: requestCountTotal,
        completed: 0,
        failed: 0
      }
    });

    if ("errorBody" in parsedItems) {
      const errorFile = GatewayFile.upload({
        organizationId: authentication.scope.organizationId,
        environment: authentication.scope.environment,
        purpose: "batch",
        filename: `${batch.id}-errors.jsonl`,
        mediaType: "application/jsonl",
        bytes: Buffer.byteLength(parsedItems.errorBody, "utf8"),
        content: parsedItems.errorBody,
        createdByUserId: authentication.apiKey.issuedByUserId,
        createdAt: occurredAt
      });
      await this.repository.createGatewayFile(errorFile);
      await this.repository.createGatewayBatchJob(
        GatewayBatchJob.rehydrate({
          ...batch.toSnapshot(),
          outputFileId: null,
          errorFileId: errorFile.id,
          status: "failed",
          createdAt: occurredAt,
          inProgressAt: null,
          completedAt: occurredAt
        }),
        []
      );

      await this.auditLog.record({
        eventName: "gateway.batch.failed",
        occurredAt: occurredAt.toISOString(),
        actorUserId: authentication.apiKey.issuedByUserId,
        organizationId: authentication.scope.organizationId,
        metadata: {
          batchId: batch.id,
          inputFileId: file.id,
          endpoint: input.endpoint,
          errorFileId: errorFile.id
        }
      });

      const failedBatch = await this.repository.findGatewayBatchJobById(
        batch.id
      );
      return { batch: failedBatch?.toSnapshot() ?? batch.toSnapshot() };
    }

    const items = parsedItems.map((item, ordinal) =>
      GatewayBatchJobItem.create({
        batchId: batch.id,
        ordinal,
        customId: item.custom_id,
        method: "POST",
        endpoint: input.endpoint,
        body: item.body
      })
    );

    await this.repository.createGatewayBatchJob(batch, items);
    await this.auditLog.record({
      eventName: "gateway.batch.created",
      occurredAt: occurredAt.toISOString(),
      actorUserId: authentication.apiKey.issuedByUserId,
      organizationId: authentication.scope.organizationId,
      metadata: {
        batchId: batch.id,
        inputFileId: file.id,
        endpoint: input.endpoint,
        requestCount: items.length
      }
    });

    return { batch: batch.toSnapshot() };
  }

  private parseAuthorizationHeader(headerValue: string): string {
    const trimmed = headerValue.trim();
    if (!trimmed.startsWith("Bearer ")) {
      throw new Error(
        "An Authorization: Bearer <org_api_key> header is required."
      );
    }
    return trimmed.slice("Bearer ".length).trim();
  }

  private parseBatchItems(
    file: GatewayFile,
    endpoint: "/v1/chat/completions" | "/v1/embeddings"
  ):
    | readonly {
        custom_id: string;
        body: Record<string, unknown>;
      }[]
    | { errorBody: string } {
    const lines = file.content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const items: { custom_id: string; body: Record<string, unknown> }[] = [];
    const errors: string[] = [];

    for (const [index, line] of lines.entries()) {
      try {
        const parsed = JSON.parse(line) as {
          custom_id?: unknown;
          method?: unknown;
          url?: unknown;
          body?: unknown;
        };

        if (
          typeof parsed.custom_id !== "string" ||
          typeof parsed.method !== "string" ||
          typeof parsed.url !== "string" ||
          parsed.method !== "POST" ||
          parsed.url !== endpoint ||
          parsed.body === null ||
          typeof parsed.body !== "object" ||
          Array.isArray(parsed.body)
        ) {
          throw new Error(
            "Each JSONL line must contain custom_id, POST method, matching url, and object body."
          );
        }

        items.push({
          custom_id: parsed.custom_id,
          body: parsed.body as Record<string, unknown>
        });
      } catch (error) {
        errors.push(
          JSON.stringify({
            line: index,
            error:
              error instanceof Error ? error.message : "Invalid batch line."
          })
        );
      }
    }

    if (errors.length > 0) {
      return { errorBody: errors.join("\n") };
    }

    return items;
  }
}
