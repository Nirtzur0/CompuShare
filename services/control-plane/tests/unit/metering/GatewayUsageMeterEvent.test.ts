import { describe, expect, it } from "vitest";
import { GatewayUsageMeterEvent } from "../../../src/domain/metering/GatewayUsageMeterEvent.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";

describe("GatewayUsageMeterEvent", () => {
  it("records chat and embedding usage events", () => {
    const embeddingEvent = GatewayUsageMeterEvent.record({
      workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
      occurredAt: "2026-03-18T09:00:00.000Z",
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
      latencyMs: 12
    });

    expect(embeddingEvent.toSnapshot()).toMatchObject({
      requestKind: "embeddings",
      batchId: "70d0bf75-8713-4627-9ff7-c65f8d08c8c3",
      batchItemId: "embed-1",
      totalTokens: 3
    });

    const chatEvent = GatewayUsageMeterEvent.record({
      workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
      occurredAt: "2026-03-18T09:00:00.000Z",
      customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
      providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
      providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
      environment: "development",
      requestKind: "chat.completions",
      approvedModelAlias: "openai/gpt-oss-120b-like",
      manifestId: "chat-gpt-oss-120b-like-v1",
      decisionLogId: "f8b89f2a-01bd-47e5-86ab-a3ae957fa214",
      promptTokens: 3,
      completionTokens: 5,
      totalTokens: 8,
      latencyMs: 24
    });

    expect(chatEvent.toSnapshot()).toMatchObject({
      requestKind: "chat.completions",
      batchId: null,
      batchItemId: null
    });
  });

  it("rejects invalid aliases, manifests, request kinds, token totals, and latency", () => {
    expect(() =>
      GatewayUsageMeterEvent.record({
        workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        occurredAt: "2026-03-18T09:00:00.000Z",
        customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
        providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
        environment: "development",
        requestKind: "embeddings",
        approvedModelAlias: "x",
        manifestId: "embed-bge-small-en-v1",
        decisionLogId: "f8b89f2a-01bd-47e5-86ab-a3ae957fa214",
        promptTokens: 3,
        completionTokens: 0,
        totalTokens: 3,
        latencyMs: 12
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      GatewayUsageMeterEvent.record({
        workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        occurredAt: "2026-03-18T09:00:00.000Z",
        customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
        providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
        environment: "development",
        requestKind: "other" as "embeddings",
        approvedModelAlias: "cheap-embed-v1",
        manifestId: "x",
        decisionLogId: "f8b89f2a-01bd-47e5-86ab-a3ae957fa214",
        promptTokens: 3,
        completionTokens: 0,
        totalTokens: 3,
        latencyMs: 12
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      GatewayUsageMeterEvent.record({
        workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        occurredAt: "2026-03-18T09:00:00.000Z",
        customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
        providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
        environment: "development",
        requestKind: "embeddings",
        approvedModelAlias: "cheap-embed-v1",
        manifestId: "embed-bge-small-en-v1",
        decisionLogId: "f8b89f2a-01bd-47e5-86ab-a3ae957fa214",
        promptTokens: 3,
        completionTokens: 0,
        totalTokens: 4,
        latencyMs: -1
      })
    ).toThrow(DomainValidationError);
  });

  it("records private connector usage events", () => {
    const event = GatewayUsageMeterEvent.record({
      workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
      occurredAt: "2026-03-18T09:00:00.000Z",
      customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
      executionTargetType: "private_connector",
      providerOrganizationId: null,
      providerNodeId: null,
      privateConnectorId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
      environment: "development",
      requestKind: "chat.completions",
      approvedModelAlias: "openai/gpt-oss-120b-like",
      manifestId: null,
      decisionLogId: null,
      promptTokens: 3,
      completionTokens: 5,
      totalTokens: 8,
      latencyMs: 24
    });

    expect(event.toSnapshot()).toMatchObject({
      executionTargetType: "private_connector",
      privateConnectorId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
      providerOrganizationId: null,
      providerNodeId: null
    });
  });

  it("rejects invalid marketplace and private connector target combinations", () => {
    expect(() =>
      GatewayUsageMeterEvent.record({
        workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        occurredAt: "2026-03-18T09:00:00.000Z",
        customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        executionTargetType: "marketplace_provider",
        providerOrganizationId: null,
        providerNodeId: null,
        privateConnectorId: null,
        environment: "development",
        requestKind: "chat.completions",
        approvedModelAlias: "openai/gpt-oss-120b-like",
        manifestId: "chat-gpt-oss-120b-like-v1",
        decisionLogId: "f8b89f2a-01bd-47e5-86ab-a3ae957fa214",
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
        latencyMs: 24
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      GatewayUsageMeterEvent.record({
        workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        occurredAt: "2026-03-18T09:00:00.000Z",
        customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        executionTargetType: "private_connector",
        providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
        providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
        privateConnectorId: null,
        environment: "development",
        requestKind: "chat.completions",
        approvedModelAlias: "openai/gpt-oss-120b-like",
        manifestId: null,
        decisionLogId: null,
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
        latencyMs: 24
      })
    ).toThrow(DomainValidationError);
  });

  it("rejects invalid decision log IDs, manifest IDs, and private connector IDs", () => {
    expect(() =>
      GatewayUsageMeterEvent.record({
        workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        occurredAt: "2026-03-18T09:00:00.000Z",
        customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        providerOrganizationId: "b7d0c48d-998d-4c29-b7ff-5697a1384cd4",
        providerNodeId: "5b667085-505d-4fba-8872-fcaa85b7c77b",
        environment: "development",
        requestKind: "chat.completions",
        approvedModelAlias: "openai/gpt-oss-120b-like",
        manifestId: "x",
        decisionLogId: "not-a-uuid",
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
        latencyMs: 24
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      GatewayUsageMeterEvent.record({
        workloadBundleId: "59ffed5c-6ea5-4dab-b8c9-80e94cd192d4",
        occurredAt: "2026-03-18T09:00:00.000Z",
        customerOrganizationId: "032b2d20-90a3-4e47-8031-d3f8fc9fcdb3",
        executionTargetType: "private_connector",
        providerOrganizationId: null,
        providerNodeId: null,
        privateConnectorId: "not-a-uuid",
        environment: "development",
        requestKind: "chat.completions",
        approvedModelAlias: "openai/gpt-oss-120b-like",
        manifestId: null,
        decisionLogId: null,
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
        latencyMs: 24
      })
    ).toThrow(DomainValidationError);
  });
});
