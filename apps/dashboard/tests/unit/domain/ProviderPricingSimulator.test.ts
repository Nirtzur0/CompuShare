import { describe, expect, it } from "vitest";
import { ProviderPricingSimulator } from "../../../src/domain/provider/ProviderPricingSimulator.js";

describe("ProviderPricingSimulator", () => {
  it("exposes stable metadata and clones snapshots defensively", () => {
    const simulator = ProviderPricingSimulator.create({
      organizationId: "org-123",
      actorRole: "finance",
      simulatableNodeCount: 1,
      unavailableNodeCount: 1,
      assumptions: {
        usageObservationDays: 7,
        settlementEconomicsDays: 30,
        projectionDays: 30,
        netProjectionStatus: "available",
        settlementCount: 1,
        realizedPlatformFeePercent: 12,
        realizedReserveHoldbackPercent: 4,
        realizedWithdrawablePercent: 84,
      },
      nodes: [
        {
          id: "node-1",
          label: "Node 1",
          region: "eu-central-1",
          hostname: "node-01.internal",
          healthState: "healthy",
          trustTier: "t1_vetted",
          gpuCount: 4,
          primaryGpuModel: "NVIDIA A100",
          currentPriceFloorUsdPerHour: 8.5,
          throughputTokensPerSecond: 690,
          observed7dTotalTokens: 41_731_200,
          observedDailyTokens: 5_961_600,
          observedUtilizationPercent: 10,
          simulationStatus: "simulatable",
          unavailableReason: null,
        },
        {
          id: "node-2",
          label: "Node 2",
          region: "us-east-1",
          hostname: "node-02.internal",
          healthState: "paused",
          trustTier: "t2_attested",
          gpuCount: 8,
          primaryGpuModel: "NVIDIA H100",
          currentPriceFloorUsdPerHour: null,
          throughputTokensPerSecond: null,
          observed7dTotalTokens: 0,
          observedDailyTokens: 0,
          observedUtilizationPercent: null,
          simulationStatus: "unavailable",
          unavailableReason: "missing_routing_profile_and_benchmark",
        },
      ],
    });

    const snapshot = simulator.toSnapshot();
    const firstNode = snapshot.nodes[0];

    if (firstNode === undefined) {
      throw new Error("Expected a first node in the pricing simulator snapshot.");
    }

    snapshot.assumptions.realizedPlatformFeePercent = 99;
    firstNode.label = "Mutated";

    expect(simulator.title).toBe("Provider pricing simulator for org-123");
    expect(simulator.actorRole).toBe("finance");
    expect(simulator.simulatableNodeCount).toBe(1);
    expect(simulator.unavailableNodeCount).toBe(1);
    expect(simulator.hasNetProjectionHistory).toBe(true);
    expect(simulator.assumptions.realizedPlatformFeePercent).toBe(12);
    expect(simulator.nodes[0]?.label).toBe("Node 1");
  });

  it("reports missing settlement history explicitly", () => {
    const simulator = ProviderPricingSimulator.create({
      organizationId: "org-123",
      actorRole: "admin",
      simulatableNodeCount: 0,
      unavailableNodeCount: 0,
      assumptions: {
        usageObservationDays: 7,
        settlementEconomicsDays: 30,
        projectionDays: 30,
        netProjectionStatus: "history_required",
        settlementCount: 0,
        realizedPlatformFeePercent: null,
        realizedReserveHoldbackPercent: null,
        realizedWithdrawablePercent: null,
      },
      nodes: [],
    });

    expect(simulator.hasNetProjectionHistory).toBe(false);
    expect(simulator.toSnapshot().assumptions.netProjectionStatus).toBe(
      "history_required",
    );
  });
});
