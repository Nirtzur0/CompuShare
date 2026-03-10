import { describe, expect, it } from "vitest";
import { ProviderPricingSimulator } from "../../../src/domain/dashboard/ProviderPricingSimulator.js";

describe("ProviderPricingSimulator", () => {
  it("derives simulatable and unavailable node baselines without fallback assumptions", () => {
    const simulator = ProviderPricingSimulator.create({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      inventorySummaries: [
        {
          node: {
            id: "node-1",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            machineId: "machine-1",
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
                  interconnect: "nvlink",
                },
              ],
            },
            routingProfile: {
              providerNodeId: "node-1",
              endpointUrl: "https://provider-1.example.com/v1/chat/completions",
              priceFloorUsdPerHour: 8.5,
              updatedAt: "2026-03-10T10:00:00.000Z",
            },
            enrolledAt: "2026-03-10T09:00:00.000Z",
          },
          latestBenchmark: {
            providerNodeId: "node-1",
            benchmarkId: "benchmark-1",
            gpuClass: "NVIDIA A100",
            vramGb: 80,
            throughputTokensPerSecond: 1,
            driverVersion: "550.54.14",
            recordedAt: "2026-03-10T09:30:00.000Z",
          },
        },
        {
          node: {
            id: "node-2",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            machineId: "machine-2",
            label: "Routing Only Node",
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
                  interconnect: "nvlink",
                },
              ],
            },
            routingProfile: {
              providerNodeId: "node-2",
              endpointUrl: "https://provider-2.example.com/v1/chat/completions",
              priceFloorUsdPerHour: 10,
              updatedAt: "2026-03-10T10:05:00.000Z",
            },
            enrolledAt: "2026-03-10T09:05:00.000Z",
          },
          latestBenchmark: null,
        },
        {
          node: {
            id: "node-3",
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            machineId: "machine-3",
            label: "Empty Inventory Node",
            runtime: "linux",
            region: "ap-south-1",
            hostname: "node-03.internal",
            trustTier: "t0_community",
            healthState: "paused",
            inventory: {
              driverVersion: "550.54.14",
              gpus: [],
            },
            routingProfile: null,
            enrolledAt: "2026-03-10T09:10:00.000Z",
          },
          latestBenchmark: null,
        },
      ],
      nodeUsageByNodeId: new Map([
        ["node-1", 1_209_600],
        ["node-2", 8_640],
      ]),
      usageObservationDays: 7,
      settlementEconomicsDays: 30,
      projectionDays: 30,
      settlementCount: 0,
      realizedPlatformFeePercent: null,
      realizedReserveHoldbackPercent: null,
      realizedWithdrawablePercent: null,
    });

    expect(simulator.toSnapshot()).toMatchObject({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      simulatableNodeCount: 1,
      unavailableNodeCount: 2,
      assumptions: {
        netProjectionStatus: "history_required",
        settlementCount: 0,
      },
      nodes: [
        {
          id: "node-1",
          simulationStatus: "simulatable",
          unavailableReason: null,
          gpuCount: 4,
          primaryGpuModel: "NVIDIA A100",
          observedDailyTokens: 172800,
          observedUtilizationPercent: 100,
        },
        {
          id: "node-2",
          simulationStatus: "unavailable",
          unavailableReason: "missing_benchmark",
          observedDailyTokens: 1234.29,
          observedUtilizationPercent: null,
        },
        {
          id: "node-3",
          simulationStatus: "unavailable",
          unavailableReason: "missing_routing_profile_and_benchmark",
          gpuCount: 0,
          primaryGpuModel: "Unknown accelerator",
          observedDailyTokens: 0,
          observedUtilizationPercent: null,
        },
      ],
    });
  });
});
