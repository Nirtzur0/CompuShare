import { describe, expect, it } from "vitest";
import { PrivateConnectorDashboard } from "../../../src/domain/dashboard/PrivateConnectorDashboard.js";
import { PrivateConnector } from "../../../src/domain/privateConnector/PrivateConnector.js";

describe("PrivateConnectorDashboard", () => {
  it("summarizes ready and stale connector counts", () => {
    const readyConnector = PrivateConnector.rehydrate({
      id: "05e1c781-8e39-40f6-ac01-1329e4d95ef0",
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      environment: "development",
      label: "Ready connector",
      mode: "cluster",
      endpointUrl:
        "https://connector.internal/v1/private-connectors/chat/completions",
      modelMappings: [
        {
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct"
        }
      ],
      runtimeVersion: "runtime-1",
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
      lastCheckInAt: new Date("2026-03-10T10:00:00.000Z"),
      lastReadyAt: new Date("2026-03-10T10:00:00.000Z"),
      disabledAt: null
    });
    const staleConnector = PrivateConnector.rehydrate({
      id: "e5e34b83-f1f5-4bd3-a862-c225c9d4a173",
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      environment: "staging",
      label: "Stale connector",
      mode: "byok_api",
      endpointUrl:
        "https://connector.internal/v1/private-connectors/chat/completions",
      modelMappings: [
        {
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct"
        }
      ],
      runtimeVersion: null,
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
      lastCheckInAt: new Date("2026-03-10T09:55:00.000Z"),
      lastReadyAt: new Date("2026-03-10T09:55:00.000Z"),
      disabledAt: null
    });

    const snapshot = PrivateConnectorDashboard.create({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      connectors: [
        {
          connector: readyConnector,
          status: "ready"
        },
        {
          connector: staleConnector,
          status: "stale"
        }
      ]
    }).toSnapshot();

    expect(snapshot).toMatchObject({
      actorRole: "finance",
      readyConnectorCount: 1,
      staleConnectorCount: 1
    });
    expect(snapshot.connectors[1]).toMatchObject({
      mode: "byok_api",
      status: "stale"
    });
  });
});
