import { describe, expect, it } from "vitest";
import { ProviderDashboardOverview } from "../../../src/domain/dashboard/ProviderDashboardOverview.js";

describe("ProviderDashboardOverview", () => {
  it("aggregates node health, trust mix, balances, and node cards", () => {
    const overview = ProviderDashboardOverview.create({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      balances: {
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "3.50",
        pendingEarningsUsd: "11.25",
        withdrawableCashUsd: "7.75"
      },
      inventorySummaries: [
        {
          node: {
            id: "aaf0f874-4a12-4a5f-b856-fd4dc8d834de",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            machineId: "machine-0001",
            label: "Primary Node",
            runtime: "linux",
            region: "eu-central-1",
            hostname: "node-01.internal",
            trustTier: "t1_vetted",
            healthState: "healthy",
            inventory: {
              driverVersion: "550.54.14",
              gpus: [
                {
                  model: "NVIDIA A100",
                  vramGb: 80,
                  count: 4,
                  interconnect: "nvlink"
                }
              ]
            },
            routingProfile: null,
            enrolledAt: "2026-03-09T10:00:00.000Z"
          },
          latestBenchmark: null
        },
        {
          node: {
            id: "2087db4a-1d0b-45fc-b900-0417602913e3",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            machineId: "machine-0002",
            label: "Warm Spare",
            runtime: "linux",
            region: "us-east-1",
            hostname: "node-02.internal",
            trustTier: "t2_attested",
            healthState: "degraded",
            inventory: {
              driverVersion: "550.54.14",
              gpus: [
                {
                  model: "NVIDIA H100",
                  vramGb: 80,
                  count: 8,
                  interconnect: "nvlink"
                }
              ]
            },
            routingProfile: null,
            enrolledAt: "2026-03-09T10:05:00.000Z"
          },
          latestBenchmark: null
        }
      ],
      earningsTrend: [
        {
          date: "2026-03-08",
          earningsUsd: "12.00",
          reserveHoldbackUsd: "1.00"
        }
      ],
      estimatedUtilizationTrend: [
        {
          date: "2026-03-08",
          totalTokens: 2400,
          estimatedUtilizationPercent: 0.01
        }
      ]
    });

    expect(overview.toSnapshot()).toEqual({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      activeNodeCount: 2,
      healthSummary: {
        healthy: 1,
        degraded: 1,
        paused: 0
      },
      trustTierSummary: {
        community: 0,
        vetted: 1,
        attested: 1
      },
      balances: {
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "3.50",
        pendingEarningsUsd: "11.25",
        withdrawableCashUsd: "7.75"
      },
      earningsTrend: [
        {
          date: "2026-03-08",
          earningsUsd: "12.00",
          reserveHoldbackUsd: "1.00"
        }
      ],
      estimatedUtilizationTrend: [
        {
          date: "2026-03-08",
          totalTokens: 2400,
          estimatedUtilizationPercent: 0.01
        }
      ],
      nodes: [
        {
          id: "aaf0f874-4a12-4a5f-b856-fd4dc8d834de",
          label: "Primary Node",
          region: "eu-central-1",
          hostname: "node-01.internal",
          healthState: "healthy",
          trustTier: "t1_vetted",
          gpuCount: 4,
          primaryGpuModel: "NVIDIA A100"
        },
        {
          id: "2087db4a-1d0b-45fc-b900-0417602913e3",
          label: "Warm Spare",
          region: "us-east-1",
          hostname: "node-02.internal",
          healthState: "degraded",
          trustTier: "t2_attested",
          gpuCount: 8,
          primaryGpuModel: "NVIDIA H100"
        }
      ]
    });
  });
});
