import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderDashboardOverview } from "../../../src/domain/provider/ProviderDashboardOverview.js";
import { ProviderDashboardScreen } from "../../../src/interfaces/react/ProviderDashboardScreen.js";

describe("ProviderDashboardScreen", () => {
  it("renders real provider overview cards and inventory rows", () => {
    const overview = ProviderDashboardOverview.create({
      organizationId: "org-123",
      actorRole: "finance",
      activeNodeCount: 2,
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "4.25",
      recentLostDisputeCount90d: 2,
      healthSummary: {
        healthy: 1,
        degraded: 1,
        paused: 0,
      },
      trustTierSummary: {
        community: 0,
        vetted: 1,
        attested: 1,
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "5.00",
        pendingEarningsUsd: "11.25",
        withdrawableCashUsd: "7.75",
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
      nodes: [
        {
          id: "node-1",
          label: "Primary Node",
          region: "eu-central-1",
          hostname: "node-01.internal",
          healthState: "healthy",
          trustTier: "t1_vetted",
          gpuCount: 4,
          primaryGpuModel: "NVIDIA A100",
        },
      ],
    });

    render(
      <ProviderDashboardScreen actorUserId="user-123" overview={overview} />,
    );

    expect(
      screen.getByRole("heading", { name: /provider overview for org-123/i }),
    ).toBeTruthy();
    expect(screen.getByText("Withdrawable cash")).toBeTruthy();
    expect(screen.getByText("$7.75")).toBeTruthy();
    expect(screen.getByText("Provider dispute visibility")).toBeTruthy();
    expect(screen.getByText("Primary Node")).toBeTruthy();
    expect(screen.getByText(/4x NVIDIA A100/)).toBeTruthy();
    expect(screen.getByText("Daily earnings")).toBeTruthy();
    expect(screen.getByText("Estimated utilization")).toBeTruthy();
  });
});
