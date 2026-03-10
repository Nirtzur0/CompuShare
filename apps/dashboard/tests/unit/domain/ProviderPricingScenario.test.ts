import { describe, expect, it } from "vitest";
import { ProviderPricingScenario } from "../../../src/domain/provider/ProviderPricingScenario.js";
import { ProviderPricingSimulator } from "../../../src/domain/provider/ProviderPricingSimulator.js";

describe("ProviderPricingScenario", () => {
  it("computes deterministic baseline and scenario pricing projections", () => {
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
        settlementCount: 2,
        realizedPlatformFeePercent: 12,
        realizedReserveHoldbackPercent: 4,
        realizedWithdrawablePercent: 80,
      },
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
          currentPriceFloorUsdPerHour: 8.5,
          throughputTokensPerSecond: 690,
          observed7dTotalTokens: 41731200,
          observedDailyTokens: 5961600,
          observedUtilizationPercent: 10,
          simulationStatus: "simulatable",
          unavailableReason: null,
        },
        {
          id: "node-2",
          label: "Missing Routing",
          region: "us-east-1",
          hostname: "node-02.internal",
          healthState: "degraded",
          trustTier: "t2_attested",
          gpuCount: 8,
          primaryGpuModel: "NVIDIA H100",
          currentPriceFloorUsdPerHour: null,
          throughputTokensPerSecond: 900,
          observed7dTotalTokens: 0,
          observedDailyTokens: 0,
          observedUtilizationPercent: 0,
          simulationStatus: "unavailable",
          unavailableReason: "missing_routing_profile",
        },
      ],
    });
    const scenario = ProviderPricingScenario.createDefault(simulator).withNodeInput(
      "node-1",
      {
        proposedPriceFloorUsdPerHour: 9.5,
        targetUtilizationPercent: 18,
      },
    );

    const projection = scenario.calculate(simulator);

    expect(projection.summary).toEqual({
      baselineMonthlyWithdrawableUsd: 489.6,
      scenarioMonthlyWithdrawableUsd: 984.96,
      monthlyDeltaUsd: 495.36,
      simulatableNodeCount: 1,
    });
    expect(projection.nodes[0]).toMatchObject({
      baselineMonthlyGrossUsd: 612,
      scenarioMonthlyGrossUsd: 1231.2,
      grossDeltaUsd: 619.2,
      baselinePlatformFeeUsd: 73.44,
      scenarioPlatformFeeUsd: 147.74,
      baselineReserveHoldbackUsd: 24.48,
      scenarioReserveHoldbackUsd: 49.25,
      baselineProjectedWithdrawableUsd: 489.6,
      scenarioProjectedWithdrawableUsd: 984.96,
      withdrawableDeltaUsd: 495.36,
    });
    expect(projection.nodes[1]).toMatchObject({
      baselineMonthlyGrossUsd: null,
      scenarioMonthlyGrossUsd: null,
      withdrawableDeltaUsd: null,
    });
  });

  it("keeps gross projections while marking net projections unavailable without history", () => {
    const simulator = ProviderPricingSimulator.create({
      organizationId: "org-123",
      actorRole: "finance",
      simulatableNodeCount: 1,
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
          currentPriceFloorUsdPerHour: 8.5,
          throughputTokensPerSecond: 690,
          observed7dTotalTokens: 41731200,
          observedDailyTokens: 5961600,
          observedUtilizationPercent: 10,
          simulationStatus: "simulatable",
          unavailableReason: null,
        },
      ],
    });
    const projection = ProviderPricingScenario.createDefault(simulator).calculate(
      simulator,
    );

    expect(projection.summary).toEqual({
      baselineMonthlyWithdrawableUsd: null,
      scenarioMonthlyWithdrawableUsd: null,
      monthlyDeltaUsd: null,
      simulatableNodeCount: 1,
    });
    expect(projection.nodes[0]).toMatchObject({
      baselineMonthlyGrossUsd: 612,
      scenarioMonthlyGrossUsd: 612,
      baselineProjectedWithdrawableUsd: null,
      scenarioProjectedWithdrawableUsd: null,
    });
  });

  it("returns the same scenario when updating an unknown node", () => {
    const simulator = ProviderPricingSimulator.create({
      organizationId: "org-123",
      actorRole: "finance",
      simulatableNodeCount: 1,
      unavailableNodeCount: 0,
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
          label: "Primary Node",
          region: "eu-central-1",
          hostname: "node-01.internal",
          healthState: "healthy",
          trustTier: "t1_vetted",
          gpuCount: 4,
          primaryGpuModel: "NVIDIA A100",
          currentPriceFloorUsdPerHour: 8.5,
          throughputTokensPerSecond: 690,
          observed7dTotalTokens: 41731200,
          observedDailyTokens: 5961600,
          observedUtilizationPercent: 10,
          simulationStatus: "simulatable",
          unavailableReason: null,
        },
      ],
    });
    const scenario = ProviderPricingScenario.createDefault(simulator);

    expect(
      scenario.withNodeInput("node-2", {
        proposedPriceFloorUsdPerHour: 9.5,
      }),
    ).toBe(scenario);
  });

  it("clamps and rounds scenario inputs at the supported boundaries", () => {
    const simulator = ProviderPricingSimulator.create({
      organizationId: "org-123",
      actorRole: "finance",
      simulatableNodeCount: 1,
      unavailableNodeCount: 0,
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
          label: "Primary Node",
          region: "eu-central-1",
          hostname: "node-01.internal",
          healthState: "healthy",
          trustTier: "t1_vetted",
          gpuCount: 4,
          primaryGpuModel: "NVIDIA A100",
          currentPriceFloorUsdPerHour: 8.5,
          throughputTokensPerSecond: 690,
          observed7dTotalTokens: 41731200,
          observedDailyTokens: 5961600,
          observedUtilizationPercent: 10,
          simulationStatus: "simulatable",
          unavailableReason: null,
        },
      ],
    });

    const lowerClamped = ProviderPricingScenario.createDefault(simulator)
      .withNodeInput("node-1", {
        proposedPriceFloorUsdPerHour: -1,
        targetUtilizationPercent: -5,
      })
      .toSnapshot();
    const upperClamped = ProviderPricingScenario.createDefault(simulator)
      .withNodeInput("node-1", {
        proposedPriceFloorUsdPerHour: 1_000_000.009,
        targetUtilizationPercent: 100.129,
      })
      .toSnapshot();

    expect(lowerClamped.nodes["node-1"]).toEqual({
      proposedPriceFloorUsdPerHour: 0.01,
      targetUtilizationPercent: 0,
    });
    expect(upperClamped.nodes["node-1"]).toEqual({
      proposedPriceFloorUsdPerHour: 1_000_000,
      targetUtilizationPercent: 100,
    });
  });
});
