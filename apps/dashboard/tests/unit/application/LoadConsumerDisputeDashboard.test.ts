import { describe, expect, it } from "vitest";
import { LoadConsumerDisputeDashboard } from "../../../src/application/consumer/LoadConsumerDisputeDashboard.js";
import { ConsumerDisputeDashboard } from "../../../src/domain/consumer/ConsumerDisputeDashboard.js";

describe("LoadConsumerDisputeDashboard", () => {
  it("delegates buyer dispute loading to the control-plane client", async () => {
    const expectedDashboard = ConsumerDisputeDashboard.create({
      organizationId: "org-123",
      actorRole: "finance",
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "4.00",
      disputes: [],
    });
    const loader = new LoadConsumerDisputeDashboard({
      getConsumerDisputeDashboard: () => Promise.resolve(expectedDashboard),
    });

    await expect(
      loader.execute({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).resolves.toBe(expectedDashboard);
  });
});
