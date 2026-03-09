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
    public readonly matchedGpu: ProviderGpuInventorySnapshot,
    public readonly latestBenchmark: ProviderBenchmarkReportSnapshot | null
  ) {}

  public static fromInventorySummary(input: {
    summary: ProviderInventorySummary;
    matchedGpu: ProviderGpuInventorySnapshot;
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
      input.summary.node.trustTier,
      routingProfile.priceFloorUsdPerHour.value,
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
