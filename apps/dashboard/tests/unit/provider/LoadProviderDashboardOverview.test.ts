import { describe, expect, it } from "vitest";
import { LoadProviderDashboardOverview } from "../../../src/application/provider/LoadProviderDashboardOverview.js";
import { ProviderDashboardOverview } from "../../../src/domain/provider/ProviderDashboardOverview.js";

describe("LoadProviderDashboardOverview", () => {
  it("delegates provider overview loading to the control-plane client", async () => {
    const expectedOverview = ProviderDashboardOverview.create({
      organizationId: "org-123",
      actorRole: "finance",
      activeNodeCount: 1,
      healthSummary: {
        healthy: 1,
        degraded: 0,
        paused: 0,
      },
      trustTierSummary: {
        community: 0,
        vetted: 1,
        attested: 0,
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "0.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "2.00",
        withdrawableCashUsd: "8.00",
      },
      earningsTrend: [],
      estimatedUtilizationTrend: [],
      nodes: [],
    });
    const loader = new LoadProviderDashboardOverview({
      getProviderDashboardOverview: () => Promise.resolve(expectedOverview),
    });

    await expect(
      loader.execute({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).resolves.toBe(expectedOverview);
  });
});
