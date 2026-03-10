import type {
  ProviderPricingSimulator,
  ProviderPricingSimulatorNodeSnapshot,
} from "./ProviderPricingSimulator.js";

export interface ProviderPricingScenarioNodeSnapshot {
  proposedPriceFloorUsdPerHour: number;
  targetUtilizationPercent: number;
}

export interface ProviderPricingScenarioSnapshot {
  nodes: Record<string, ProviderPricingScenarioNodeSnapshot>;
}

export interface ProviderPricingScenarioNodeResult {
  node: ProviderPricingSimulatorNodeSnapshot;
  scenario: ProviderPricingScenarioNodeSnapshot | null;
  baselineMonthlyGrossUsd: number | null;
  scenarioMonthlyGrossUsd: number | null;
  grossDeltaUsd: number | null;
  baselinePlatformFeeUsd: number | null;
  scenarioPlatformFeeUsd: number | null;
  baselineReserveHoldbackUsd: number | null;
  scenarioReserveHoldbackUsd: number | null;
  baselineProjectedWithdrawableUsd: number | null;
  scenarioProjectedWithdrawableUsd: number | null;
  withdrawableDeltaUsd: number | null;
}

export class ProviderPricingScenario {
  private constructor(
    private readonly snapshot: ProviderPricingScenarioSnapshot
  ) {}

  public static createDefault(
    simulator: ProviderPricingSimulator
  ): ProviderPricingScenario {
    return new ProviderPricingScenario({
      nodes: Object.fromEntries(
        simulator.nodes
          .filter((node) => node.simulationStatus === "simulatable")
          .map((node) => [
            node.id,
            {
              proposedPriceFloorUsdPerHour:
                node.currentPriceFloorUsdPerHour ?? 0.01,
              targetUtilizationPercent: node.observedUtilizationPercent ?? 0,
            },
          ])
      ),
    });
  }

  public static create(
    snapshot: ProviderPricingScenarioSnapshot
  ): ProviderPricingScenario {
    return new ProviderPricingScenario(snapshot);
  }

  public toSnapshot(): ProviderPricingScenarioSnapshot {
    return {
      nodes: Object.fromEntries(
        Object.entries(this.snapshot.nodes).map(([nodeId, nodeScenario]) => [
          nodeId,
          { ...nodeScenario },
        ])
      ),
    };
  }

  public withNodeInput(
    nodeId: string,
    input: Partial<ProviderPricingScenarioNodeSnapshot>
  ): ProviderPricingScenario {
    const existing = this.snapshot.nodes[nodeId];

    if (existing === undefined) {
      return this;
    }

    return new ProviderPricingScenario({
      nodes: {
        ...this.snapshot.nodes,
        [nodeId]: {
          proposedPriceFloorUsdPerHour: ProviderPricingScenario.roundToTwoDecimals(
            ProviderPricingScenario.clamp(
              input.proposedPriceFloorUsdPerHour ??
                existing.proposedPriceFloorUsdPerHour,
              0.01,
              1_000_000
            )
          ),
          targetUtilizationPercent: ProviderPricingScenario.roundToTwoDecimals(
            ProviderPricingScenario.clamp(
              input.targetUtilizationPercent ??
                existing.targetUtilizationPercent,
              0,
              100
            )
          ),
        },
      },
    });
  }

  public calculate(simulator: ProviderPricingSimulator): {
    summary: {
      baselineMonthlyWithdrawableUsd: number | null;
      scenarioMonthlyWithdrawableUsd: number | null;
      monthlyDeltaUsd: number | null;
      simulatableNodeCount: number;
    };
    nodes: ProviderPricingScenarioNodeResult[];
  } {
    const hasNetProjectionHistory = simulator.hasNetProjectionHistory;
    let baselineMonthlyWithdrawableUsd = 0;
    let scenarioMonthlyWithdrawableUsd = 0;

    const nodes = simulator.nodes.map((node) => {
      if (node.simulationStatus === "unavailable") {
        return {
          node,
          scenario: null,
          baselineMonthlyGrossUsd: null,
          scenarioMonthlyGrossUsd: null,
          grossDeltaUsd: null,
          baselinePlatformFeeUsd: null,
          scenarioPlatformFeeUsd: null,
          baselineReserveHoldbackUsd: null,
          scenarioReserveHoldbackUsd: null,
          baselineProjectedWithdrawableUsd: null,
          scenarioProjectedWithdrawableUsd: null,
          withdrawableDeltaUsd: null,
        };
      }

      const scenario = this.snapshot.nodes[node.id];
      const baselineMonthlyGrossUsd = ProviderPricingScenario.roundToTwoDecimals(
        ProviderPricingScenario.resolveMonthlyGrossUsd({
          priceFloorUsdPerHour: node.currentPriceFloorUsdPerHour ?? 0,
          utilizationPercent: node.observedUtilizationPercent ?? 0,
          projectionDays: simulator.assumptions.projectionDays,
        })
      );
      const scenarioMonthlyGrossUsd = ProviderPricingScenario.roundToTwoDecimals(
        ProviderPricingScenario.resolveMonthlyGrossUsd({
          priceFloorUsdPerHour: scenario?.proposedPriceFloorUsdPerHour ?? 0,
          utilizationPercent: scenario?.targetUtilizationPercent ?? 0,
          projectionDays: simulator.assumptions.projectionDays,
        })
      );
      const baselineProjectedWithdrawableUsd = hasNetProjectionHistory
        ? ProviderPricingScenario.applyRatePercent(
            baselineMonthlyGrossUsd,
            simulator.assumptions.realizedWithdrawablePercent
          )
        : null;
      const scenarioProjectedWithdrawableUsd = hasNetProjectionHistory
        ? ProviderPricingScenario.applyRatePercent(
            scenarioMonthlyGrossUsd,
            simulator.assumptions.realizedWithdrawablePercent
          )
        : null;

      if (
        baselineProjectedWithdrawableUsd !== null &&
        scenarioProjectedWithdrawableUsd !== null
      ) {
        baselineMonthlyWithdrawableUsd += baselineProjectedWithdrawableUsd;
        scenarioMonthlyWithdrawableUsd += scenarioProjectedWithdrawableUsd;
      }

      return {
        node,
        scenario: scenario ?? null,
        baselineMonthlyGrossUsd,
        scenarioMonthlyGrossUsd,
        grossDeltaUsd: ProviderPricingScenario.roundToTwoDecimals(
          scenarioMonthlyGrossUsd - baselineMonthlyGrossUsd
        ),
        baselinePlatformFeeUsd: hasNetProjectionHistory
          ? ProviderPricingScenario.applyRatePercent(
              baselineMonthlyGrossUsd,
              simulator.assumptions.realizedPlatformFeePercent
            )
          : null,
        scenarioPlatformFeeUsd: hasNetProjectionHistory
          ? ProviderPricingScenario.applyRatePercent(
              scenarioMonthlyGrossUsd,
              simulator.assumptions.realizedPlatformFeePercent
            )
          : null,
        baselineReserveHoldbackUsd: hasNetProjectionHistory
          ? ProviderPricingScenario.applyRatePercent(
              baselineMonthlyGrossUsd,
              simulator.assumptions.realizedReserveHoldbackPercent
            )
          : null,
        scenarioReserveHoldbackUsd: hasNetProjectionHistory
          ? ProviderPricingScenario.applyRatePercent(
              scenarioMonthlyGrossUsd,
              simulator.assumptions.realizedReserveHoldbackPercent
            )
          : null,
        baselineProjectedWithdrawableUsd,
        scenarioProjectedWithdrawableUsd,
        withdrawableDeltaUsd:
          baselineProjectedWithdrawableUsd === null ||
          scenarioProjectedWithdrawableUsd === null
            ? null
            : ProviderPricingScenario.roundToTwoDecimals(
                scenarioProjectedWithdrawableUsd -
                  baselineProjectedWithdrawableUsd
              ),
      };
    });

    return {
      summary: {
        baselineMonthlyWithdrawableUsd: hasNetProjectionHistory
          ? ProviderPricingScenario.roundToTwoDecimals(
              baselineMonthlyWithdrawableUsd
            )
          : null,
        scenarioMonthlyWithdrawableUsd: hasNetProjectionHistory
          ? ProviderPricingScenario.roundToTwoDecimals(
              scenarioMonthlyWithdrawableUsd
            )
          : null,
        monthlyDeltaUsd: hasNetProjectionHistory
          ? ProviderPricingScenario.roundToTwoDecimals(
              scenarioMonthlyWithdrawableUsd - baselineMonthlyWithdrawableUsd
            )
          : null,
        simulatableNodeCount: simulator.simulatableNodeCount,
      },
      nodes,
    };
  }

  private static resolveMonthlyGrossUsd(input: {
    priceFloorUsdPerHour: number;
    utilizationPercent: number;
    projectionDays: number;
  }): number {
    return (
      input.priceFloorUsdPerHour *
      24 *
      (input.utilizationPercent / 100) *
      input.projectionDays
    );
  }

  private static applyRatePercent(
    grossUsd: number,
    ratePercent: number | null
  ): number | null {
    if (ratePercent === null) {
      return null;
    }

    return ProviderPricingScenario.roundToTwoDecimals(
      grossUsd * (ratePercent / 100)
    );
  }

  private static clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }

  private static roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
