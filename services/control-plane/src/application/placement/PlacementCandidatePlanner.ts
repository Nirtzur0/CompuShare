import { PlacementCandidate } from "../../domain/placement/PlacementCandidate.js";
import type { PlacementRequirements } from "../../domain/placement/PlacementRequirements.js";
import type { ProviderInventorySummary } from "../../domain/provider/ProviderInventorySummary.js";

export class PlacementCandidatePlanner {
  public buildCandidates(
    requirements: PlacementRequirements,
    summaries: readonly ProviderInventorySummary[]
  ): PlacementCandidate[] {
    return summaries
      .flatMap((summary) => {
        const matchedGpu = requirements.match(summary);

        if (matchedGpu === null) {
          return [];
        }

        return [
          PlacementCandidate.fromInventorySummary({
            summary,
            matchedGpu
          })
        ];
      })
      .sort((left, right) =>
        left.providerNodeId.localeCompare(right.providerNodeId)
      );
  }

  public selectDeterministicSyncCandidate(
    candidates: readonly PlacementCandidate[]
  ): PlacementCandidate | null {
    const sortedCandidates = [...candidates].sort((left, right) => {
      if (left.priceFloorUsdPerHour !== right.priceFloorUsdPerHour) {
        return left.priceFloorUsdPerHour - right.priceFloorUsdPerHour;
      }

      return left.providerNodeId.localeCompare(right.providerNodeId);
    });

    return sortedCandidates[0] ?? null;
  }
}
