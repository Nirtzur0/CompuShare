import { describe, expect, it } from "vitest";
import { PrivateConnectorDashboard } from "../../../src/domain/consumer/PrivateConnectorDashboard.js";

describe("PrivateConnectorDashboard", () => {
  it("derives private connector summary counts from the snapshot", () => {
    const dashboard = PrivateConnectorDashboard.create({
      organizationId: "org-123",
      actorRole: "finance",
      readyConnectorCount: 1,
      staleConnectorCount: 1,
      connectors: [
        {
          id: "connector-1",
          label: "Primary",
          environment: "development",
          mode: "cluster",
          status: "ready",
          endpointUrl: "http://connector.internal",
          runtimeVersion: "runtime-1",
          lastCheckInAt: "2026-03-10T10:00:00.000Z",
          modelMappings: [
            {
              requestModelAlias: "openai/gpt-oss-120b-like",
              upstreamModelId: "gpt-oss-120b-instruct",
            },
          ],
        },
        {
          id: "connector-2",
          label: "Backup",
          environment: "staging",
          mode: "byok_api",
          status: "stale",
          endpointUrl: "https://api.example.com",
          runtimeVersion: null,
          lastCheckInAt: null,
          modelMappings: [],
        },
        {
          id: "connector-3",
          label: "Disabled",
          environment: "production",
          mode: "cluster",
          status: "disabled",
          endpointUrl: "http://disabled.internal",
          runtimeVersion: null,
          lastCheckInAt: null,
          modelMappings: [],
        },
      ],
    });

    expect(dashboard.title).toBe("Private connectors for org-123");
    expect(dashboard.readyConnectorCount).toBe(1);
    expect(dashboard.staleConnectorCount).toBe(1);
    expect(dashboard.pendingConnectorCount).toBe(0);
    expect(dashboard.disabledConnectorCount).toBe(1);
    expect(dashboard.connectors).toHaveLength(3);
  });
});
