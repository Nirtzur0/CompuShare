import { describe, expect, it } from "vitest";
import { ProviderDashboardOverview } from "../../../src/domain/dashboard/ProviderDashboardOverview.js";

describe("ProviderDashboardOverview", () => {
  it("aggregates node health, trust mix, balances, and node cards", () => {
    const overview = ProviderDashboardOverview.create({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "4.25",
      recentLostDisputeCount90d: 2,
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
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "4.25",
      recentLostDisputeCount90d: 2,
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

  it("handles paused community nodes without GPU inventory", () => {
    const overview = ProviderDashboardOverview.create({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "owner",
      activeDisputeCount: 0,
      activeDisputeHoldUsd: "0.00",
      recentLostDisputeCount90d: 0,
      balances: {
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        usageBalanceUsd: "0.00",
        spendCreditsUsd: "0.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      },
      inventorySummaries: [
        {
          node: {
            id: "0d10cfc1-9cff-42ce-9bd6-749b66d1d941",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            machineId: "machine-0003",
            label: "Paused Community Node",
            runtime: "linux",
            region: "eu-west-1",
            hostname: "node-03.internal",
            trustTier: "t0_community",
            healthState: "paused",
            inventory: {
              driverVersion: "550.54.14",
              gpus: []
            },
            routingProfile: null,
            enrolledAt: "2026-03-09T10:10:00.000Z"
          },
          latestBenchmark: null
        }
      ],
      earningsTrend: [],
      estimatedUtilizationTrend: []
    });

    expect(overview.toSnapshot()).toMatchObject({
      activeNodeCount: 1,
      healthSummary: {
        healthy: 0,
        degraded: 0,
        paused: 1
      },
      trustTierSummary: {
        community: 1,
        vetted: 0,
        attested: 0
      },
      nodes: [
        {
          id: "0d10cfc1-9cff-42ce-9bd6-749b66d1d941",
          gpuCount: 0,
          primaryGpuModel: "Unknown accelerator"
        }
      ]
    });
  });
});
