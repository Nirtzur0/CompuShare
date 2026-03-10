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
  actorRole: "owner" | "admin" | "developer" | "finance";
  simulatableNodeCount: number;
  unavailableNodeCount: number;
  assumptions: ProviderPricingSimulatorAssumptionsSnapshot;
  nodes: ProviderPricingSimulatorNodeSnapshot[];
}

export class ProviderPricingSimulator {
  private constructor(
    private readonly snapshot: ProviderPricingSimulatorSnapshot
  ) {}

  public static create(
    snapshot: ProviderPricingSimulatorSnapshot
  ): ProviderPricingSimulator {
    return new ProviderPricingSimulator(snapshot);
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

  public get title(): string {
    return `Provider pricing simulator for ${this.snapshot.organizationId}`;
  }

  public get actorRole(): ProviderPricingSimulatorSnapshot["actorRole"] {
    return this.snapshot.actorRole;
  }

  public get assumptions(): ProviderPricingSimulatorAssumptionsSnapshot {
    return this.snapshot.assumptions;
  }

  public get nodes(): readonly ProviderPricingSimulatorNodeSnapshot[] {
    return this.snapshot.nodes;
  }

  public get simulatableNodeCount(): number {
    return this.snapshot.simulatableNodeCount;
  }

  public get unavailableNodeCount(): number {
    return this.snapshot.unavailableNodeCount;
  }

  public get hasNetProjectionHistory(): boolean {
    return this.snapshot.assumptions.netProjectionStatus === "available";
  }
}
