import { describe, expect, it } from "vitest";
import { ProviderDashboardOverview } from "../../../src/domain/provider/ProviderDashboardOverview.js";

describe("ProviderDashboardOverview", () => {
  it("derives card view models from the provider overview snapshot", () => {
    const overview = ProviderDashboardOverview.create({
      organizationId: "org-123",
      actorRole: "finance",
      activeNodeCount: 3,
      healthSummary: {
        healthy: 2,
        degraded: 1,
        paused: 0,
      },
      trustTierSummary: {
        community: 0,
        vetted: 2,
        attested: 1,
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "30.00",
        spendCreditsUsd: "4.25",
        pendingEarningsUsd: "12.50",
        withdrawableCashUsd: "22.75",
      },
      earningsTrend: [
        {
          date: "2026-03-08",
          earningsUsd: "12.00",
          reserveHoldbackUsd: "1.00",
        },
      ],
      estimatedUtilizationTrend: [
        {
          date: "2026-03-08",
          totalTokens: 2400,
          estimatedUtilizationPercent: 0.01,
        },
      ],
      nodes: [],
    });

    expect(overview.title).toContain("org-123");
    expect(overview.trustMixLabel).toBe("2 vetted / 1 attested / 0 community");
    expect(overview.balanceCards).toEqual([
      expect.objectContaining({
        label: "Spend credits",
        valueUsd: "4.25",
      }),
      expect.objectContaining({
        label: "Pending earnings",
        valueUsd: "12.50",
      }),
      expect.objectContaining({
        label: "Withdrawable cash",
        valueUsd: "22.75",
      }),
    ]);
    expect(overview.earningsTrend).toEqual([
      expect.objectContaining({
        earningsUsd: "12.00",
      }),
    ]);
  });
});
