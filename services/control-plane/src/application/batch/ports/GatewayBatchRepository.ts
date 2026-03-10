import type { GatewayBatchJob } from "../../../domain/batch/GatewayBatchJob.js";
import type { GatewayBatchJobItem } from "../../../domain/batch/GatewayBatchJobItem.js";
import type { GatewayFile } from "../../../domain/batch/GatewayFile.js";

export interface GatewayBatchRepository {
  createGatewayFile(file: GatewayFile): Promise<void>;
  findGatewayFileById(fileId: string): Promise<GatewayFile | null>;
  createGatewayBatchJob(
    batch: GatewayBatchJob,
    items: readonly GatewayBatchJobItem[]
  ): Promise<void>;
  findGatewayBatchJobById(batchId: string): Promise<GatewayBatchJob | null>;
  listGatewayBatchItems(
    batchId: string
  ): Promise<readonly GatewayBatchJobItem[]>;
  updateGatewayBatchStatus(input: {
    batchId: string;
    status:
      | "validating"
      | "in_progress"
      | "finalizing"
      | "completed"
      | "failed"
      | "cancelling"
      | "cancelled";
    inProgressAt?: string | null;
    completedAt?: string | null;
    outputFileId?: string | null;
    errorFileId?: string | null;
  }): Promise<void>;
  markGatewayBatchItemCompleted(input: {
    batchId: string;
    ordinal: number;
    responseBody: Record<string, unknown>;
    completedAt: string;
  }): Promise<void>;
  markGatewayBatchItemFailed(input: {
    batchId: string;
    ordinal: number;
    errorBody: Record<string, unknown>;
    completedAt: string;
  }): Promise<void>;
  markGatewayBatchItemCancelled(input: {
    batchId: string;
    ordinal: number;
    completedAt: string;
  }): Promise<void>;
  claimNextGatewayBatch(): Promise<GatewayBatchJob | null>;
}
