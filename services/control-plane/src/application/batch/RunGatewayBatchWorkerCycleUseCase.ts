import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ExecuteChatCompletionUseCase } from "../gateway/ExecuteChatCompletionUseCase.js";
import type { ExecuteEmbeddingUseCase } from "../gateway/ExecuteEmbeddingUseCase.js";
import type { GatewayBatchRepository } from "./ports/GatewayBatchRepository.js";
import { GatewayFile } from "../../domain/batch/GatewayFile.js";

export class RunGatewayBatchWorkerCycleUseCase {
  public static readonly DEFAULT_WORKER_ACTOR_USER_ID =
    "00000000-0000-0000-0000-000000000001";

  public constructor(
    private readonly repository: GatewayBatchRepository,
    private readonly executeChatCompletionUseCase: Pick<
      ExecuteChatCompletionUseCase,
      "executeAuthenticated"
    >,
    private readonly executeEmbeddingUseCase: Pick<
      ExecuteEmbeddingUseCase,
      "executeAuthenticated"
    >,
    private readonly auditLog: AuditLog,
    private readonly workerActorUserId = RunGatewayBatchWorkerCycleUseCase.DEFAULT_WORKER_ACTOR_USER_ID,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(): Promise<{ processedBatchId: string | null }> {
    const batch = await this.repository.claimNextGatewayBatch();

    if (batch === null) {
      return { processedBatchId: null };
    }

    const items = await this.repository.listGatewayBatchItems(batch.id);
    const occurredAt = this.clock();
    const outputLines: string[] = [];
    const errorLines: string[] = [];

    for (const item of items) {
      const currentBatch = await this.repository.findGatewayBatchJobById(
        batch.id
      );

      if (currentBatch?.status === "cancelling") {
        await this.repository.markGatewayBatchItemCancelled({
          batchId: batch.id,
          ordinal: item.ordinal,
          completedAt: occurredAt.toISOString()
        });
        continue;
      }

      try {
        const response =
          item.endpoint === "/v1/chat/completions"
            ? await this.executeChatCompletionUseCase.executeAuthenticated({
                context: {
                  organizationId: batch.organizationId.value,
                  environment: batch.environment,
                  apiKeyId: batch.id,
                  issuedByUserId: batch.createdByUserId
                },
                request: item.body as never
              })
            : await this.executeEmbeddingUseCase.executeAuthenticated({
                context: {
                  organizationId: batch.organizationId.value,
                  environment: batch.environment,
                  apiKeyId: batch.id,
                  issuedByUserId: batch.createdByUserId
                },
                request: item.body as never
              });

        await this.repository.markGatewayBatchItemCompleted({
          batchId: batch.id,
          ordinal: item.ordinal,
          responseBody: response as unknown as Record<string, unknown>,
          completedAt: occurredAt.toISOString()
        });
        outputLines.push(
          JSON.stringify({
            custom_id: item.customId,
            response
          })
        );
      } catch (error) {
        const errorBody = {
          message: error instanceof Error ? error.message : "Batch item failed."
        };
        await this.repository.markGatewayBatchItemFailed({
          batchId: batch.id,
          ordinal: item.ordinal,
          errorBody,
          completedAt: occurredAt.toISOString()
        });
        errorLines.push(
          JSON.stringify({
            custom_id: item.customId,
            error: errorBody
          })
        );
      }
    }

    await this.repository.updateGatewayBatchStatus({
      batchId: batch.id,
      status: "finalizing"
    });

    const outputFile = outputLines.length
      ? GatewayFile.upload({
          organizationId: batch.organizationId.value,
          environment: batch.environment,
          purpose: "batch",
          filename: `${batch.id}-output.jsonl`,
          mediaType: "application/jsonl",
          bytes: Buffer.byteLength(outputLines.join("\n"), "utf8"),
          content: outputLines.join("\n"),
          createdByUserId: batch.createdByUserId,
          createdAt: occurredAt
        })
      : null;
    const errorFile = errorLines.length
      ? GatewayFile.upload({
          organizationId: batch.organizationId.value,
          environment: batch.environment,
          purpose: "batch",
          filename: `${batch.id}-errors.jsonl`,
          mediaType: "application/jsonl",
          bytes: Buffer.byteLength(errorLines.join("\n"), "utf8"),
          content: errorLines.join("\n"),
          createdByUserId: batch.createdByUserId,
          createdAt: occurredAt
        })
      : null;

    if (outputFile !== null) {
      await this.repository.createGatewayFile(outputFile);
    }

    if (errorFile !== null) {
      await this.repository.createGatewayFile(errorFile);
    }

    const refreshed = await this.repository.findGatewayBatchJobById(batch.id);
    const finalStatus =
      refreshed?.status === "cancelling"
        ? "cancelled"
        : errorLines.length > 0
          ? outputLines.length > 0
            ? "completed"
            : "failed"
          : "completed";

    await this.repository.updateGatewayBatchStatus({
      batchId: batch.id,
      status: finalStatus,
      completedAt: occurredAt.toISOString(),
      outputFileId: outputFile?.id ?? null,
      errorFileId: errorFile?.id ?? null
    });

    await this.auditLog.record({
      eventName:
        finalStatus === "failed"
          ? "gateway.batch.failed"
          : "gateway.batch.completed",
      occurredAt: occurredAt.toISOString(),
      actorUserId: this.workerActorUserId,
      organizationId: batch.organizationId.value,
      metadata: {
        batchId: batch.id,
        outputFileId: outputFile?.id ?? null,
        errorFileId: errorFile?.id ?? null,
        finalStatus
      }
    });

    return { processedBatchId: batch.id };
  }
}
