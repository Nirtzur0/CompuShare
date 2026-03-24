import { describe, expect, it } from "vitest";
import { LoadProviderDisputeDashboard } from "../../../src/application/provider/LoadProviderDisputeDashboard.js";
import { ProviderDisputeDashboard } from "../../../src/domain/provider/ProviderDisputeDashboard.js";

describe("LoadProviderDisputeDashboard", () => {
  it("delegates provider dispute loading to the control-plane client", async () => {
    const expectedDashboard = ProviderDisputeDashboard.create({
      organizationId: "org-123",
      actorRole: "finance",
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "2.50",
      recentLostDisputeCount90d: 1,
      disputes: [],
    });
    const loader = new LoadProviderDisputeDashboard({
      getProviderDisputeDashboard: () => Promise.resolve(expectedDashboard),
    });

    await expect(
      loader.execute({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).resolves.toBe(expectedDashboard);
  });
});
