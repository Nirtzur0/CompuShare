import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProviderPricingSimulatorScreen } from "../../../src/interfaces/react/ProviderPricingSimulatorScreen.js";

describe("ProviderPricingSimulatorScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders scenario cards and recomputes local what-if projections", () => {
    render(
      <ProviderPricingSimulatorScreen
        snapshot={{
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
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /provider pricing simulator for org-123/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Simulatable nodes")).toBeTruthy();
    expect(screen.getByText("Routing profile missing")).toBeTruthy();
    expect(screen.getAllByText("$489.60").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Scenario floor for Primary Node"), {
      target: { value: "9.5" },
    });
    fireEvent.change(
      screen.getByLabelText("Target utilization for Primary Node"),
      {
        target: { value: "18" },
      },
    );

    expect(screen.getAllByText("$984.96").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$495.36").length).toBeGreaterThan(0);
    expect(screen.getByText(/Gross delta: \$619.20/)).toBeTruthy();
  });

  it("renders explicit history-required messaging when net projections are unavailable", () => {
    render(
      <ProviderPricingSimulatorScreen
        snapshot={{
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
        }}
      />,
    );

    expect(screen.getByText(/gross projections are available/i)).toBeTruthy();
    expect(screen.getAllByText("History required").length).toBeGreaterThan(0);
  });

  it("renders explicit unavailable reasons for missing benchmark variants", () => {
    render(
      <ProviderPricingSimulatorScreen
        snapshot={{
          organizationId: "org-123",
          actorRole: "finance",
          simulatableNodeCount: 0,
          unavailableNodeCount: 2,
          assumptions: {
            usageObservationDays: 7,
            settlementEconomicsDays: 30,
            projectionDays: 30,
            netProjectionStatus: "available",
            settlementCount: 1,
            realizedPlatformFeePercent: 12,
            realizedReserveHoldbackPercent: 4,
            realizedWithdrawablePercent: 80,
          },
          nodes: [
            {
              id: "node-1",
              label: "Missing Benchmark",
              region: "eu-central-1",
              hostname: "node-01.internal",
              healthState: "healthy",
              trustTier: "t1_vetted",
              gpuCount: 4,
              primaryGpuModel: "NVIDIA A100",
              currentPriceFloorUsdPerHour: 8.5,
              throughputTokensPerSecond: null,
              observed7dTotalTokens: 0,
              observedDailyTokens: 0,
              observedUtilizationPercent: null,
              simulationStatus: "unavailable",
              unavailableReason: "missing_benchmark",
            },
            {
              id: "node-2",
              label: "Missing Both",
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
        }}
      />,
    );

    expect(screen.getByText("Benchmark missing")).toBeTruthy();
    expect(
      screen.getByText("Routing profile and benchmark missing"),
    ).toBeTruthy();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(1);
  });

  it("clamps out-of-range edits through the local what-if controls", () => {
    render(
      <ProviderPricingSimulatorScreen
        snapshot={{
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
          ],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Scenario floor for Primary Node"), {
      target: { value: "0" },
    });
    fireEvent.change(
      screen.getByLabelText("Target utilization for Primary Node"),
      {
        target: { value: "-1" },
      },
    );

    const scenarioFloorInput = screen.getByLabelText(
      "Scenario floor for Primary Node",
    );
    const targetUtilizationInput = screen.getByLabelText(
      "Target utilization for Primary Node",
    );

    expect(scenarioFloorInput instanceof HTMLInputElement).toBe(true);
    expect(targetUtilizationInput instanceof HTMLInputElement).toBe(true);

    if (
      !(scenarioFloorInput instanceof HTMLInputElement) ||
      !(targetUtilizationInput instanceof HTMLInputElement)
    ) {
      throw new Error("Expected the pricing controls to render numeric inputs.");
    }

    expect(scenarioFloorInput.value).toBe("0.01");
    expect(targetUtilizationInput.value).toBe("0");
    expect(screen.getByText(/Gross delta: -\$612.00/)).toBeTruthy();
  });
});
