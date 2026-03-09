import type { OrganizationRole } from "../identity/OrganizationRole.js";
import type { OrganizationWalletSummarySnapshot } from "../ledger/OrganizationWalletSummary.js";
import type { ConsumerSpendSummarySnapshot } from "./ConsumerSpendSummary.js";

export interface ConsumerDashboardOverviewSnapshot {
  organizationId: string;
  actorRole: OrganizationRole;
  spendSummary: ConsumerSpendSummarySnapshot;
  balances: OrganizationWalletSummarySnapshot;
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
    private readonly snapshot: ConsumerDashboardOverviewSnapshot
  ) {}

  public static create(input: {
    organizationId: string;
    actorRole: OrganizationRole;
    spendSummary: ConsumerSpendSummarySnapshot;
    balances: OrganizationWalletSummarySnapshot;
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
  }): ConsumerDashboardOverview {
    return new ConsumerDashboardOverview({
      organizationId: input.organizationId,
      actorRole: input.actorRole,
      spendSummary: input.spendSummary,
      balances: input.balances,
      usageTrend: input.usageTrend,
      latencyByModel: input.latencyByModel
    });
  }

  public toSnapshot(): ConsumerDashboardOverviewSnapshot {
    return {
      organizationId: this.snapshot.organizationId,
      actorRole: this.snapshot.actorRole,
      spendSummary: {
        ...this.snapshot.spendSummary
      },
      balances: {
        ...this.snapshot.balances
      },
      usageTrend: this.snapshot.usageTrend.map((point) => ({ ...point })),
      latencyByModel: this.snapshot.latencyByModel.map((point) => ({
        ...point
      }))
    };
  }
}
