import { describe, expect, it } from "vitest";
import { RecordGatewayUsageMeterEventUseCase } from "../../../src/application/metering/RecordGatewayUsageMeterEventUseCase.js";
import type { AuditEvent } from "../../../src/application/identity/ports/AuditLog.js";

describe("RecordGatewayUsageMeterEventUseCase", () => {
  it("defaults request kind to chat.completions and omits empty batch metadata", async () => {
    let appendCount = 0;
    const auditEvents: AuditEvent[] = [];
    const useCase = new RecordGatewayUsageMeterEventUseCase(
      {
        appendGatewayUsageMeterEvent: (event) => {
          void event;
          appendCount += 1;
          return Promise.resolve();
        }
      },
      {
        record: (event) => {
          auditEvents.push(event);
          return Promise.resolve();
        }
      },
      () => new Date("2026-03-18T09:00:00.000Z")
    );

    const response = await useCase.execute({
      workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
      actorUserId: "user-1",
      customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
      providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
      providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
      environment: "development",
      approvedModelAlias: "openai/gpt-oss-120b-like",
      manifestId: "chat-gpt-oss-120b-like-v1",
      decisionLogId: "f8b89f2a-01bd-47e5-86ab-a3ae957fa214",
      promptTokens: 3,
      completionTokens: 5,
      totalTokens: 8,
      latencyMs: 24
    });

    expect(appendCount).toBe(1);
    expect(response.event.requestKind).toBe("chat.completions");
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.eventName).toBe("metering.gateway_usage_recorded");
    expect(auditEvents[0]?.metadata.batchId).toBeUndefined();
    expect(auditEvents[0]?.metadata.batchItemId).toBeUndefined();
  });

  it("includes batch metadata when present", async () => {
    const auditEvents: AuditEvent[] = [];
    const useCase = new RecordGatewayUsageMeterEventUseCase(
      {
        appendGatewayUsageMeterEvent: () => Promise.resolve()
      },
      {
        record: (event) => {
          auditEvents.push(event);
          return Promise.resolve();
        }
      }
    );

    await useCase.execute({
      workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
      actorUserId: "user-1",
      customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
      providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
      providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
      environment: "development",
      requestKind: "embeddings",
      approvedModelAlias: "cheap-embed-v1",
      manifestId: "embed-bge-small-en-v1",
      decisionLogId: "f8b89f2a-01bd-47e5-86ab-a3ae957fa214",
      batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
      batchItemId: "embed-1",
      promptTokens: 3,
      completionTokens: 0,
      totalTokens: 3,
      latencyMs: 24
    });

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.metadata.batchId).toBe(
      "70d0bf75-8713-4627-9ff7-c65f8d08c8c3"
    );
    expect(auditEvents[0]?.metadata.batchItemId).toBe("embed-1");
    expect(auditEvents[0]?.metadata.requestKind).toBe("embeddings");
  });
});
