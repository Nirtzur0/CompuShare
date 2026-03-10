import type { OrganizationRole } from "../identity/OrganizationRole.js";
import type { ProviderInventorySummarySnapshot } from "../provider/ProviderInventorySummary.js";

export type ProviderPricingSimulatorNetProjectionStatus =
  | "available"
  | "history_required";

export type ProviderPricingSimulatorNodeStatus = "simulatable" | "unavailable";

export type ProviderPricingSimulatorNodeUnavailableReason =
  | "missing_routing_profile"
  | "missing_benchmark"
  | "missing_routing_profile_and_benchmark"
  | null;

export interface ProviderPricingSimulatorAssumptionsSnapshot {
  usageObservationDays: number;
  settlementEconomicsDays: number;
  projectionDays: number;
  netProjectionStatus: ProviderPricingSimulatorNetProjectionStatus;
  settlementCount: number;
  realizedPlatformFeePercent: number | null;
  realizedReserveHoldbackPercent: number | null;
  realizedWithdrawablePercent: number | null;
}

export interface ProviderPricingSimulatorNodeSnapshot {
  id: string;
  label: string;
  region: string;
  hostname: string;
  healthState: "healthy" | "degraded" | "paused";
  trustTier: "t0_community" | "t1_vetted" | "t2_attested";
  gpuCount: number;
  primaryGpuModel: string;
  currentPriceFloorUsdPerHour: number | null;
  throughputTokensPerSecond: number | null;
  observed7dTotalTokens: number;
  observedDailyTokens: number;
  observedUtilizationPercent: number | null;
  simulationStatus: ProviderPricingSimulatorNodeStatus;
  unavailableReason: ProviderPricingSimulatorNodeUnavailableReason;
}

export interface ProviderPricingSimulatorSnapshot {
  organizationId: string;
  actorRole: OrganizationRole;
  simulatableNodeCount: number;
  unavailableNodeCount: number;
  assumptions: ProviderPricingSimulatorAssumptionsSnapshot;
  nodes: ProviderPricingSimulatorNodeSnapshot[];
}

export class ProviderPricingSimulator {
  private constructor(
    private readonly snapshot: ProviderPricingSimulatorSnapshot
  ) {}

  public static create(input: {
    organizationId: string;
    actorRole: OrganizationRole;
    inventorySummaries: readonly ProviderInventorySummarySnapshot[];
    nodeUsageByNodeId: ReadonlyMap<string, number>;
    usageObservationDays: number;
    settlementEconomicsDays: number;
    projectionDays: number;
    settlementCount: number;
    realizedPlatformFeePercent: number | null;
    realizedReserveHoldbackPercent: number | null;
    realizedWithdrawablePercent: number | null;
  }): ProviderPricingSimulator {
    let simulatableNodeCount = 0;
    let unavailableNodeCount = 0;

    const nodes = input.inventorySummaries.map((summary) => {
      const currentPriceFloorUsdPerHour =
        summary.node.routingProfile?.priceFloorUsdPerHour ?? null;
      const throughputTokensPerSecond =
        summary.latestBenchmark?.throughputTokensPerSecond ?? null;
      const observed7dTotalTokens =
        input.nodeUsageByNodeId.get(summary.node.id) ?? 0;
      const observedDailyTokens = ProviderPricingSimulator.roundToTwoDecimals(
        observed7dTotalTokens / input.usageObservationDays
      );
      const unavailableReason =
        ProviderPricingSimulator.resolveUnavailableReason({
          currentPriceFloorUsdPerHour,
          throughputTokensPerSecond
        });
      const simulationStatus: ProviderPricingSimulatorNodeStatus =
        unavailableReason === null ? "simulatable" : "unavailable";

      if (simulationStatus === "simulatable") {
        simulatableNodeCount += 1;
      } else {
        unavailableNodeCount += 1;
      }

      return {
        id: summary.node.id,
        label: summary.node.label,
        region: summary.node.region,
        hostname: summary.node.hostname,
        healthState: summary.node.healthState,
        trustTier: summary.node.trustTier,
        gpuCount: summary.node.inventory.gpus.reduce(
          (total, gpu) => total + gpu.count,
          0
        ),
        primaryGpuModel:
          summary.node.inventory.gpus[0]?.model ?? "Unknown accelerator",
        currentPriceFloorUsdPerHour,
        throughputTokensPerSecond,
        observed7dTotalTokens,
        observedDailyTokens,
        observedUtilizationPercent:
          throughputTokensPerSecond === null
            ? null
            : ProviderPricingSimulator.roundToTwoDecimals(
                ProviderPricingSimulator.clamp(
                  (observedDailyTokens /
                    (throughputTokensPerSecond * 86_400)) *
                    100,
                  0,
                  100
                )
              ),
        simulationStatus,
        unavailableReason
      };
    });

    return new ProviderPricingSimulator({
      organizationId: input.organizationId,
      actorRole: input.actorRole,
      simulatableNodeCount,
      unavailableNodeCount,
      assumptions: {
        usageObservationDays: input.usageObservationDays,
        settlementEconomicsDays: input.settlementEconomicsDays,
        projectionDays: input.projectionDays,
        netProjectionStatus:
          input.settlementCount === 0 ? "history_required" : "available",
        settlementCount: input.settlementCount,
        realizedPlatformFeePercent: input.realizedPlatformFeePercent,
        realizedReserveHoldbackPercent: input.realizedReserveHoldbackPercent,
        realizedWithdrawablePercent: input.realizedWithdrawablePercent
      },
      nodes
    });
  }

  public toSnapshot(): ProviderPricingSimulatorSnapshot {
    return {
      organizationId: this.snapshot.organizationId,
      actorRole: this.snapshot.actorRole,
      simulatableNodeCount: this.snapshot.simulatableNodeCount,
      unavailableNodeCount: this.snapshot.unavailableNodeCount,
      assumptions: {
        ...this.snapshot.assumptions
      },
      nodes: this.snapshot.nodes.map((node) => ({ ...node }))
    };
  }

  private static resolveUnavailableReason(input: {
    currentPriceFloorUsdPerHour: number | null;
    throughputTokensPerSecond: number | null;
  }): ProviderPricingSimulatorNodeUnavailableReason {
    const hasRoutingProfile = input.currentPriceFloorUsdPerHour !== null;
    const hasBenchmark = input.throughputTokensPerSecond !== null;

    if (hasRoutingProfile && hasBenchmark) {
      return null;
    }

    if (!hasRoutingProfile && !hasBenchmark) {
      return "missing_routing_profile_and_benchmark";
    }

    return hasRoutingProfile ? "missing_benchmark" : "missing_routing_profile";
  }

  private static clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }

  private static roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
