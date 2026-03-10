import type { ProviderBenchmarkReportSnapshot } from "../provider/ProviderBenchmarkReport.js";
import type { ProviderGpuInventorySnapshot } from "../provider/ProviderGpuInventory.js";
import type { ProviderInventorySummary } from "../provider/ProviderInventorySummary.js";

export interface PlacementCandidateSnapshot {
  providerNodeId: string;
  providerOrganizationId: string;
  providerNodeLabel: string;
  region: string;
  trustTier: string;
  priceFloorUsdPerHour: number;
  score?: number;
  scoreBreakdown?: {
    pricePerformanceScore: number;
    warmCacheMultiplier: number;
    benchmarkThroughputTokensPerSecond: number;
    priceFloorUsdPerHour: number;
  };
  warmCache?: {
    matched: boolean;
    expiresAt: string | null;
  };
  matchedGpu: ProviderGpuInventorySnapshot;
  latestBenchmark: ProviderBenchmarkReportSnapshot | null;
}

export interface PlacementCandidateSelectionSnapshot extends PlacementCandidateSnapshot {
  endpointUrl: string;
}

export class PlacementCandidate {
  public constructor(
    public readonly providerNodeId: string,
    public readonly providerOrganizationId: string,
    public readonly providerNodeLabel: string,
    public readonly endpointUrl: string,
    public readonly region: string,
    public readonly trustTier: string,
    public readonly priceFloorUsdPerHour: number,
    public readonly score: number,
    public readonly pricePerformanceScore: number,
    public readonly warmCacheMultiplier: number,
    public readonly warmCacheExpiresAt: Date | null,
    public readonly matchedGpu: ProviderGpuInventorySnapshot,
    public readonly latestBenchmark: ProviderBenchmarkReportSnapshot | null
  ) {}

  public static fromInventorySummary(input: {
    summary: ProviderInventorySummary;
    matchedGpu: ProviderGpuInventorySnapshot;
    score: number;
    pricePerformanceScore: number;
    warmCacheMultiplier: number;
    warmCacheExpiresAt: Date | null;
  }): PlacementCandidate {
    const routingProfile = input.summary.node.routingProfile;

    if (routingProfile === null) {
      throw new Error(
        "PlacementCandidate requires a routing profile for the provider node."
      );
    }

    return new PlacementCandidate(
      input.summary.node.id.value,
      input.summary.node.organizationId.value,
      input.summary.node.label.value,
      routingProfile.endpointUrl.value,
      input.summary.node.region.value,
      input.summary.node.attestation.effectiveTrustTier,
      routingProfile.priceFloorUsdPerHour.value,
      input.score,
      input.pricePerformanceScore,
      input.warmCacheMultiplier,
      input.warmCacheExpiresAt,
      input.matchedGpu,
      input.summary.latestBenchmark?.toSnapshot() ?? null
    );
  }

  public toSnapshot(): PlacementCandidateSnapshot {
    return {
      providerNodeId: this.providerNodeId,
      providerOrganizationId: this.providerOrganizationId,
      providerNodeLabel: this.providerNodeLabel,
      region: this.region,
      trustTier: this.trustTier,
      priceFloorUsdPerHour: this.priceFloorUsdPerHour,
      score: this.score,
      scoreBreakdown: {
        pricePerformanceScore: this.pricePerformanceScore,
        warmCacheMultiplier: this.warmCacheMultiplier,
        benchmarkThroughputTokensPerSecond:
          this.latestBenchmark?.throughputTokensPerSecond ?? 0,
        priceFloorUsdPerHour: this.priceFloorUsdPerHour
      },
      warmCache: {
        matched: this.warmCacheMultiplier > 1,
        expiresAt: this.warmCacheExpiresAt?.toISOString() ?? null
      },
      matchedGpu: this.matchedGpu,
      latestBenchmark: this.latestBenchmark
    };
  }

  public toSelectionSnapshot(): PlacementCandidateSelectionSnapshot {
    return {
      ...this.toSnapshot(),
      endpointUrl: this.endpointUrl
    };
  }
}
