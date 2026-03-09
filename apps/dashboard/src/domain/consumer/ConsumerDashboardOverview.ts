export interface ConsumerDashboardOverviewSnapshot {
  organizationId: string;
  actorRole: "owner" | "admin" | "developer" | "finance";
  spendSummary: {
    lifetimeFundedUsd: string;
    lifetimeSettledSpendUsd: string;
  };
  balances: {
    organizationId: string;
    usageBalanceUsd: string;
    spendCreditsUsd: string;
    pendingEarningsUsd: string;
    withdrawableCashUsd: string;
  };
  usageTrend: {
    date: string;
    requestCount: number;
    totalTokens: number;
  }[];
  latencyByModel: {
    modelAlias: string;
    requestCount: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    totalTokens: number;
  }[];
}

export class ConsumerDashboardOverview {
  private constructor(
    private readonly snapshot: ConsumerDashboardOverviewSnapshot,
  ) {}

  public static create(
    snapshot: ConsumerDashboardOverviewSnapshot,
  ): ConsumerDashboardOverview {
    return new ConsumerDashboardOverview(snapshot);
  }

  public get title(): string {
    return `Consumer overview for ${this.snapshot.organizationId}`;
  }

  public get balanceCards(): readonly {
    label: string;
    valueUsd: string;
    tone: "neutral" | "success" | "warning";
    description: string;
  }[] {
    return [
      {
        label: "Prepaid balance",
        valueUsd: this.snapshot.balances.usageBalanceUsd,
        tone: "success",
        description: "Available cash balance ready for routed usage.",
      },
      {
        label: "Spend credits",
        valueUsd: this.snapshot.balances.spendCreditsUsd,
        tone: "neutral",
        description: "Platform-only credits that reduce billable usage first.",
      },
    ];
  }

  public get spendCards(): readonly {
    label: string;
    valueUsd: string;
    tone: "neutral" | "success" | "warning";
    description: string;
  }[] {
    return [
      {
        label: "Lifetime funded",
        valueUsd: this.snapshot.spendSummary.lifetimeFundedUsd,
        tone: "neutral",
        description:
          "Customer charge transactions posted into prepaid balance.",
      },
      {
        label: "Settled spend",
        valueUsd: this.snapshot.spendSummary.lifetimeSettledSpendUsd,
        tone: "warning",
        description:
          "Completed job settlements already deducted from prepaid cash.",
      },
    ];
  }

  public get actorRole(): ConsumerDashboardOverviewSnapshot["actorRole"] {
    return this.snapshot.actorRole;
  }

  public get remainingBudgetLabel(): string {
    return `${this.snapshot.balances.usageBalanceUsd} prepaid / ${this.snapshot.balances.spendCreditsUsd} credits`;
  }

  public get usageTrend(): readonly {
    date: string;
    requestCount: number;
    totalTokens: number;
  }[] {
    return this.snapshot.usageTrend;
  }

  public get latencyByModel(): readonly {
    modelAlias: string;
    requestCount: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    totalTokens: number;
  }[] {
    return this.snapshot.latencyByModel;
  }
}
