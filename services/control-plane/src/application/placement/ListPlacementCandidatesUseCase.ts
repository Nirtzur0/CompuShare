import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { PlacementCandidateSnapshot } from "../../domain/placement/PlacementCandidate.js";
import { PlacementRequirements } from "../../domain/placement/PlacementRequirements.js";
import { PlacementScoringPolicy } from "../../config/PlacementScoringPolicy.js";
import { PlacementCandidatePlanner } from "./PlacementCandidatePlanner.js";
import type { PlacementCandidateRepository } from "./ports/PlacementCandidateRepository.js";

export interface ListPlacementCandidatesRequest {
  organizationId: string;
  gpuClass: string;
  minVramGb: number;
  region: string;
  minimumTrustTier: string;
  maxPriceUsdPerHour: number;
  approvedModelAlias?: string;
}

export interface ListPlacementCandidatesResponse {
  candidates: PlacementCandidateSnapshot[];
}

export class PlacementOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "PlacementOrganizationNotFoundError";
  }
}

export class PlacementBuyerCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have buyer capability before previewing placement candidates."
    );
    this.name = "PlacementBuyerCapabilityRequiredError";
  }
}

export class ListPlacementCandidatesUseCase {
  public constructor(
    private readonly repository: PlacementCandidateRepository,
    private readonly planner: PlacementCandidatePlanner = new PlacementCandidatePlanner(
      PlacementScoringPolicy.createDefault()
    ),
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: ListPlacementCandidatesRequest
  ): Promise<ListPlacementCandidatesResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new PlacementOrganizationNotFoundError(organizationId.value);
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new PlacementBuyerCapabilityRequiredError();
    }

    const requirements = PlacementRequirements.create({
      gpuClass: request.gpuClass,
      minVramGb: request.minVramGb,
      region: request.region,
      minimumTrustTier: request.minimumTrustTier,
      maxPriceUsdPerHour: request.maxPriceUsdPerHour
    });
    const lostDisputeCounts =
      await this.repository.listRecentLostDisputeCountsByProviderOrganization({
        lostSinceInclusive: new Date(
          this.clock().getTime() - 90 * 24 * 60 * 60 * 1000
        )
      });
    const candidates = this.planner.buildCandidates(
      requirements,
      await this.repository.listPlacementProviderInventorySummaries(),
      new Map(
        lostDisputeCounts.map((entry) => [
          entry.providerOrganizationId,
          entry.lostDisputeCount
        ])
      ),
      request.approvedModelAlias
    );

    return {
      candidates: candidates.map((candidate) => candidate.toSnapshot())
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }
}
