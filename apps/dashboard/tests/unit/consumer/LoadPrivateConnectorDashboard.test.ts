import { describe, expect, it } from "vitest";
import { LoadPrivateConnectorDashboard } from "../../../src/application/consumer/LoadPrivateConnectorDashboard.js";
import { PrivateConnectorDashboard } from "../../../src/domain/consumer/PrivateConnectorDashboard.js";

describe("LoadPrivateConnectorDashboard", () => {
  it("delegates private connector dashboard loading to the control-plane client", async () => {
    const expectedDashboard = PrivateConnectorDashboard.create({
      organizationId: "org-123",
      actorRole: "finance",
      readyConnectorCount: 1,
      staleConnectorCount: 0,
      connectors: [],
    });
    const loader = new LoadPrivateConnectorDashboard({
      getPrivateConnectorDashboard: () => Promise.resolve(expectedDashboard),
    });

    await expect(
      loader.execute({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).resolves.toBe(expectedDashboard);
  });
});
