import type { AuditLog } from "../identity/ports/AuditLog.js";
import { GatewayUsageMeterEvent } from "../../domain/metering/GatewayUsageMeterEvent.js";
import type { GatewayUsageMeterEventRepository } from "./ports/GatewayUsageMeterEventRepository.js";

export interface RecordGatewayUsageMeterEventRequest {
  workloadBundleId: string;
  occurredAt?: string;
  actorUserId: string;
  customerOrganizationId: string;
  providerOrganizationId: string;
  providerNodeId: string;
  environment: "development" | "staging" | "production";
  requestKind?: "chat.completions" | "embeddings";
  approvedModelAlias: string;
  manifestId: string;
  decisionLogId: string;
  batchId?: string | null;
  batchItemId?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface RecordGatewayUsageMeterEventResponse {
  event: ReturnType<GatewayUsageMeterEvent["toSnapshot"]>;
}

export class RecordGatewayUsageMeterEventUseCase {
  public constructor(
    private readonly repository: GatewayUsageMeterEventRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: RecordGatewayUsageMeterEventRequest
  ): Promise<RecordGatewayUsageMeterEventResponse> {
    const recordedAt = request.occurredAt ?? this.clock().toISOString();
    const event = GatewayUsageMeterEvent.record({
      ...request,
      requestKind: request.requestKind ?? "chat.completions",
      occurredAt: recordedAt
    });

    await this.repository.appendGatewayUsageMeterEvent(event);
    const snapshot = event.toSnapshot();

    await this.auditLog.record({
      eventName: "metering.gateway_usage_recorded",
      occurredAt: snapshot.occurredAt,
      actorUserId: request.actorUserId,
      organizationId: snapshot.customerOrganizationId,
      metadata: {
        workloadBundleId: snapshot.workloadBundleId,
        approvedModelAlias: snapshot.approvedModelAlias,
        manifestId: snapshot.manifestId,
        decisionLogId: snapshot.decisionLogId,
        providerOrganizationId: snapshot.providerOrganizationId,
        providerNodeId: snapshot.providerNodeId,
        requestKind: snapshot.requestKind,
        promptTokens: snapshot.promptTokens,
        completionTokens: snapshot.completionTokens,
        totalTokens: snapshot.totalTokens,
        latencyMs: snapshot.latencyMs,
        ...(snapshot.batchId === null ? {} : { batchId: snapshot.batchId }),
        ...(snapshot.batchItemId === null
          ? {}
          : { batchItemId: snapshot.batchItemId })
      }
    });

    return {
      event: snapshot
    };
  }
}
