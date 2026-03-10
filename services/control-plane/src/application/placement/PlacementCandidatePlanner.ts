import { PlacementCandidate } from "../../domain/placement/PlacementCandidate.js";
import type { PlacementRequirements } from "../../domain/placement/PlacementRequirements.js";
import type { ProviderInventorySummary } from "../../domain/provider/ProviderInventorySummary.js";
import type { PlacementScoringPolicy } from "../../config/PlacementScoringPolicy.js";

export class PlacementCandidatePlanner {
  public constructor(
    private readonly placementScoringPolicy: PlacementScoringPolicy,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public buildCandidates(
    requirements: PlacementRequirements,
    summaries: readonly ProviderInventorySummary[],
    approvedModelAlias?: string
  ): PlacementCandidate[] {
    return summaries
      .flatMap((summary) => {
        if (summary.node.healthState !== "healthy") {
          return [];
        }

        const matchedGpu = requirements.match(summary);

        if (matchedGpu === null || summary.latestBenchmark === null) {
          return [];
        }

        const routingProfile = summary.node.routingProfile;

        if (routingProfile === null) {
          return [];
        }

        const pricePerformanceScore =
          summary.latestBenchmark.throughputTokensPerSecond.value /
          routingProfile.priceFloorUsdPerHour.value;
        const warmCacheMatch =
          approvedModelAlias === undefined
            ? null
            : summary.node.routingState.findWarmModelAlias(
                approvedModelAlias,
                this.clock()
              );
        const warmCacheMultiplier =
          warmCacheMatch === null
            ? 1
            : this.placementScoringPolicy.warmCacheMultiplier;

        return [
          PlacementCandidate.fromInventorySummary({
            summary,
            matchedGpu,
            score: pricePerformanceScore * warmCacheMultiplier,
            pricePerformanceScore,
            warmCacheMultiplier,
            warmCacheExpiresAt: warmCacheMatch?.expiresAt ?? null
          })
        ];
      })
      .sort((left, right) => this.compareCandidates(left, right));
  }

  public selectDeterministicSyncCandidate(
    candidates: readonly PlacementCandidate[]
  ): PlacementCandidate | null {
    const sortedCandidates = [...candidates].sort((left, right) =>
      this.compareCandidates(left, right)
    );

    return sortedCandidates[0] ?? null;
  }

  private compareCandidates(
    left: PlacementCandidate,
    right: PlacementCandidate
  ): number {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    if (left.priceFloorUsdPerHour !== right.priceFloorUsdPerHour) {
      return left.priceFloorUsdPerHour - right.priceFloorUsdPerHour;
    }

    const leftRecordedAt = left.latestBenchmark?.recordedAt ?? "";
    const rightRecordedAt = right.latestBenchmark?.recordedAt ?? "";

    if (leftRecordedAt !== rightRecordedAt) {
      return rightRecordedAt.localeCompare(leftRecordedAt);
    }

    return left.providerNodeId.localeCompare(right.providerNodeId);
  }
}
