export interface ProviderDashboardNodeSnapshot {
  id: string;
  label: string;
  region: string;
  hostname: string;
  healthState: "healthy" | "degraded" | "paused";
  trustTier: "t0_community" | "t1_vetted" | "t2_attested";
  gpuCount: number;
  primaryGpuModel: string;
}

export interface ProviderDashboardOverviewSnapshot {
  organizationId: string;
  actorRole: "owner" | "admin" | "developer" | "finance";
  activeNodeCount: number;
  activeDisputeCount: number;
  activeDisputeHoldUsd: string;
  recentLostDisputeCount90d: number;
  healthSummary: {
    healthy: number;
    degraded: number;
    paused: number;
  };
  trustTierSummary: {
    community: number;
    vetted: number;
    attested: number;
  };
  balances: {
    organizationId: string;
    usageBalanceUsd: string;
    spendCreditsUsd: string;
    pendingEarningsUsd: string;
    withdrawableCashUsd: string;
  };
  nodes: ProviderDashboardNodeSnapshot[];
  earningsTrend: {
    date: string;
    earningsUsd: string;
    reserveHoldbackUsd: string;
  }[];
  estimatedUtilizationTrend: {
    date: string;
    totalTokens: number;
    estimatedUtilizationPercent: number;
  }[];
}

export class ProviderDashboardOverview {
  private constructor(
    private readonly snapshot: ProviderDashboardOverviewSnapshot,
  ) {}

  public static create(
    snapshot: ProviderDashboardOverviewSnapshot,
  ): ProviderDashboardOverview {
    return new ProviderDashboardOverview(snapshot);
  }

  public get title(): string {
    return `Provider overview for ${this.snapshot.organizationId}`;
  }

  public get organizationId(): string {
    return this.snapshot.organizationId;
  }

  public get balanceCards(): readonly {
    label: string;
    valueUsd: string;
    tone: "neutral" | "success" | "warning";
    description: string;
  }[] {
    return [
      {
        label: "Spend credits",
        valueUsd: this.snapshot.balances.spendCreditsUsd,
        tone: "neutral",
        description: "Platform-only credits that can offset your own usage.",
      },
      {
        label: "Pending earnings",
        valueUsd: this.snapshot.balances.pendingEarningsUsd,
        tone: "warning",
        description: "Provider earnings still under reserve holdback.",
      },
      {
        label: "Withdrawable cash",
        valueUsd: this.snapshot.balances.withdrawableCashUsd,
        tone: "success",
        description: "Settled provider earnings ready for payout export.",
      },
      {
        label: "Active dispute hold",
        valueUsd: this.snapshot.activeDisputeHoldUsd,
        tone: this.snapshot.activeDisputeCount > 0 ? "warning" : "neutral",
        description: "Open, under-review, and lost disputes reduce payout eligibility.",
      },
    ];
  }

  public get nodeHealthCards(): readonly {
    label: string;
    value: string;
    emphasis: string;
  }[] {
    return [
      {
        label: "Active nodes",
        value: String(this.snapshot.activeNodeCount),
        emphasis: "Inventory live",
      },
      {
        label: "Healthy nodes",
        value: String(this.snapshot.healthSummary.healthy),
        emphasis: "Passing runtime checks",
      },
      {
        label: "Verified trust",
        value: String(
          this.snapshot.trustTierSummary.vetted +
            this.snapshot.trustTierSummary.attested,
        ),
        emphasis: "Vetted or attested nodes",
      },
    ];
  }

  public get trustMixLabel(): string {
    return `${String(this.snapshot.trustTierSummary.vetted)} vetted / ${String(this.snapshot.trustTierSummary.attested)} attested / ${String(this.snapshot.trustTierSummary.community)} community`;
  }

  public get nodes(): readonly ProviderDashboardNodeSnapshot[] {
    return this.snapshot.nodes;
  }

  public get actorRole(): ProviderDashboardOverviewSnapshot["actorRole"] {
    return this.snapshot.actorRole;
  }

  public get earningsTrend(): readonly {
    date: string;
    earningsUsd: string;
    reserveHoldbackUsd: string;
  }[] {
    return this.snapshot.earningsTrend;
  }

  public get estimatedUtilizationTrend(): readonly {
    date: string;
    totalTokens: number;
    estimatedUtilizationPercent: number;
  }[] {
    return this.snapshot.estimatedUtilizationTrend;
  }

  public get activeDisputeCount(): number {
    return this.snapshot.activeDisputeCount;
  }

  public get activeDisputeHoldUsd(): string {
    return this.snapshot.activeDisputeHoldUsd;
  }

  public get recentLostDisputeCount90d(): number {
    return this.snapshot.recentLostDisputeCount90d;
  }
}
