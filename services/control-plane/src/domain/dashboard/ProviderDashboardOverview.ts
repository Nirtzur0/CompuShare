import type { OrganizationRole } from "../identity/OrganizationRole.js";
import type { OrganizationWalletSummarySnapshot } from "../ledger/OrganizationWalletSummary.js";
import type { ProviderInventorySummarySnapshot } from "../provider/ProviderInventorySummary.js";

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

export interface ProviderDashboardEarningsTrendPointSnapshot {
  date: string;
  earningsUsd: string;
  reserveHoldbackUsd: string;
}

export interface ProviderDashboardEstimatedUtilizationTrendPointSnapshot {
  date: string;
  totalTokens: number;
  estimatedUtilizationPercent: number;
}

export interface ProviderDashboardOverviewSnapshot {
  organizationId: string;
  actorRole: OrganizationRole;
  activeNodeCount: number;
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
  balances: OrganizationWalletSummarySnapshot;
  nodes: ProviderDashboardNodeSnapshot[];
  earningsTrend: ProviderDashboardEarningsTrendPointSnapshot[];
  estimatedUtilizationTrend: ProviderDashboardEstimatedUtilizationTrendPointSnapshot[];
}

export class ProviderDashboardOverview {
  private constructor(
    private readonly snapshot: ProviderDashboardOverviewSnapshot
  ) {}

  public static create(input: {
    organizationId: string;
    actorRole: OrganizationRole;
    inventorySummaries: readonly ProviderInventorySummarySnapshot[];
    balances: OrganizationWalletSummarySnapshot;
    earningsTrend: ProviderDashboardEarningsTrendPointSnapshot[];
    estimatedUtilizationTrend: ProviderDashboardEstimatedUtilizationTrendPointSnapshot[];
  }): ProviderDashboardOverview {
    const healthSummary = {
      healthy: 0,
      degraded: 0,
      paused: 0
    };
    const trustTierSummary = {
      community: 0,
      vetted: 0,
      attested: 0
    };

    const nodes = input.inventorySummaries.map((summary) => {
      healthSummary[summary.node.healthState] += 1;

      switch (summary.node.trustTier) {
        case "t0_community":
          trustTierSummary.community += 1;
          break;
        case "t1_vetted":
          trustTierSummary.vetted += 1;
          break;
        case "t2_attested":
          trustTierSummary.attested += 1;
          break;
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
          summary.node.inventory.gpus[0]?.model ?? "Unknown accelerator"
      };
    });

    return new ProviderDashboardOverview({
      organizationId: input.organizationId,
      actorRole: input.actorRole,
      activeNodeCount: nodes.length,
      healthSummary,
      trustTierSummary,
      balances: input.balances,
      nodes,
      earningsTrend: input.earningsTrend,
      estimatedUtilizationTrend: input.estimatedUtilizationTrend
    });
  }

  public toSnapshot(): ProviderDashboardOverviewSnapshot {
    return {
      organizationId: this.snapshot.organizationId,
      actorRole: this.snapshot.actorRole,
      activeNodeCount: this.snapshot.activeNodeCount,
      healthSummary: {
        ...this.snapshot.healthSummary
      },
      trustTierSummary: {
        ...this.snapshot.trustTierSummary
      },
      balances: {
        ...this.snapshot.balances
      },
      nodes: this.snapshot.nodes.map((node) => ({ ...node })),
      earningsTrend: this.snapshot.earningsTrend.map((point) => ({
        ...point
      })),
      estimatedUtilizationTrend: this.snapshot.estimatedUtilizationTrend.map(
        (point) => ({ ...point })
      )
    };
  }
}
