import { randomUUID } from "node:crypto";
import {
  type OrganizationApiKeyEnvironment,
  parseOrganizationApiKeyEnvironment
} from "../identity/OrganizationApiKeyEnvironment.js";
import { OrganizationId } from "../identity/OrganizationId.js";
import { DomainValidationError } from "../identity/DomainValidationError.js";

export type PlacementDecisionRejectionReason = "no_eligible_provider";

export interface PlacementDecisionLogFiltersSnapshot {
  gpuClass: string;
  minVramGb: number;
  region: string;
  minimumTrustTier: string;
  maxPriceUsdPerHour: number;
}

export interface PlacementDecisionLogSnapshot {
  id: string;
  organizationId: string;
  environment: OrganizationApiKeyEnvironment;
  filters: PlacementDecisionLogFiltersSnapshot;
  approvedModelAlias: string | null;
  candidateCount: number;
  selectedProviderNodeId: string | null;
  selectedProviderOrganizationId: string | null;
  selectionScore: number | null;
  pricePerformanceScore: number | null;
  warmCacheMatched: boolean | null;
  rejectionReason: PlacementDecisionRejectionReason | null;
  createdAt: string;
}

export class PlacementDecisionLog {
  private constructor(
    public readonly id: string,
    public readonly organizationId: OrganizationId,
    public readonly environment: OrganizationApiKeyEnvironment,
    public readonly filters: PlacementDecisionLogFiltersSnapshot,
    public readonly approvedModelAlias: string | null,
    public readonly candidateCount: number,
    public readonly selectedProviderNodeId: string | null,
    public readonly selectedProviderOrganizationId: string | null,
    public readonly selectionScore: number | null,
    public readonly pricePerformanceScore: number | null,
    public readonly warmCacheMatched: boolean | null,
    public readonly rejectionReason: PlacementDecisionRejectionReason | null,
    public readonly createdAt: Date
  ) {}

  public static recordSelection(input: {
    organizationId: string;
    environment: string;
    filters: PlacementDecisionLogFiltersSnapshot;
    approvedModelAlias: string | null;
    candidateCount: number;
    selectedProviderNodeId: string;
    selectedProviderOrganizationId: string;
    selectionScore: number;
    pricePerformanceScore: number;
    warmCacheMatched: boolean;
    createdAt: Date;
  }): PlacementDecisionLog {
    this.validateCandidateCount(input.candidateCount);

    if (input.candidateCount < 1) {
      throw new DomainValidationError(
        "Placement decision candidate count must be at least 1 for a selection."
      );
    }

    return new PlacementDecisionLog(
      randomUUID(),
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      input.filters,
      input.approvedModelAlias,
      input.candidateCount,
      input.selectedProviderNodeId,
      input.selectedProviderOrganizationId,
      input.selectionScore,
      input.pricePerformanceScore,
      input.warmCacheMatched,
      null,
      input.createdAt
    );
  }

  public static recordRejection(input: {
    organizationId: string;
    environment: string;
    filters: PlacementDecisionLogFiltersSnapshot;
    approvedModelAlias: string | null;
    candidateCount: number;
    rejectionReason: PlacementDecisionRejectionReason;
    createdAt: Date;
  }): PlacementDecisionLog {
    this.validateCandidateCount(input.candidateCount);

    return new PlacementDecisionLog(
      randomUUID(),
      OrganizationId.create(input.organizationId),
      parseOrganizationApiKeyEnvironment(input.environment),
      input.filters,
      input.approvedModelAlias,
      input.candidateCount,
      null,
      null,
      null,
      null,
      null,
      input.rejectionReason,
      input.createdAt
    );
  }

  public toSnapshot(): PlacementDecisionLogSnapshot {
    return {
      id: this.id,
      organizationId: this.organizationId.value,
      environment: this.environment,
      filters: this.filters,
      approvedModelAlias: this.approvedModelAlias,
      candidateCount: this.candidateCount,
      selectedProviderNodeId: this.selectedProviderNodeId,
      selectedProviderOrganizationId: this.selectedProviderOrganizationId,
      selectionScore: this.selectionScore,
      pricePerformanceScore: this.pricePerformanceScore,
      warmCacheMatched: this.warmCacheMatched,
      rejectionReason: this.rejectionReason,
      createdAt: this.createdAt.toISOString()
    };
  }

  private static validateCandidateCount(candidateCount: number): void {
    if (!Number.isInteger(candidateCount) || candidateCount < 0) {
      throw new DomainValidationError(
        "Placement decision candidate count must be a non-negative integer."
      );
    }
  }
}
