import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { PlacementDecisionLog } from "../../domain/placement/PlacementDecisionLog.js";
import { PlacementRequirements } from "../../domain/placement/PlacementRequirements.js";
import type { PlacementCandidateSelectionSnapshot } from "../../domain/placement/PlacementCandidate.js";
import { PlacementCandidatePlanner } from "./PlacementCandidatePlanner.js";
import type { SyncPlacementRepository } from "./ports/SyncPlacementRepository.js";

export interface ResolveSyncPlacementRequest {
  organizationId: string;
  environment: string;
  gpuClass: string;
  minVramGb: number;
  region: string;
  minimumTrustTier: string;
  maxPriceUsdPerHour: number;
}

export interface ResolveSyncPlacementResponse {
  decisionLogId: string;
  candidateCount: number;
  selection: PlacementCandidateSelectionSnapshot;
}

export class SyncPlacementOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "SyncPlacementOrganizationNotFoundError";
  }
}

export class SyncPlacementBuyerCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have buyer capability before resolving sync placement."
    );
    this.name = "SyncPlacementBuyerCapabilityRequiredError";
  }
}

export class NoEligiblePlacementCandidateError extends Error {
  public constructor() {
    super(
      "No eligible provider node matched the requested placement constraints."
    );
    this.name = "NoEligiblePlacementCandidateError";
  }
}

export class ResolveSyncPlacementUseCase {
  public constructor(
    private readonly repository: SyncPlacementRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
    private readonly planner: PlacementCandidatePlanner = new PlacementCandidatePlanner()
  ) {}

  public async execute(
    request: ResolveSyncPlacementRequest
  ): Promise<ResolveSyncPlacementResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new SyncPlacementOrganizationNotFoundError(organizationId.value);
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new SyncPlacementBuyerCapabilityRequiredError();
    }

    const requirements = PlacementRequirements.create({
      gpuClass: request.gpuClass,
      minVramGb: request.minVramGb,
      region: request.region,
      minimumTrustTier: request.minimumTrustTier,
      maxPriceUsdPerHour: request.maxPriceUsdPerHour
    });
    const occurredAt = this.clock();
    const candidates = this.planner.buildCandidates(
      requirements,
      await this.repository.listPlacementProviderInventorySummaries()
    );
    const selectedCandidate =
      this.planner.selectDeterministicSyncCandidate(candidates);

    if (selectedCandidate === null) {
      const decisionLog = PlacementDecisionLog.recordRejection({
        organizationId: organizationId.value,
        environment: request.environment,
        filters: requirements.toSnapshot(),
        candidateCount: candidates.length,
        rejectionReason: "no_eligible_provider",
        createdAt: occurredAt
      });

      await this.repository.createPlacementDecisionLog(decisionLog);
      await this.recordAuditEvent(
        decisionLog.id,
        organizationId.value,
        request,
        occurredAt,
        {
          candidateCount: candidates.length,
          rejectionReason: "no_eligible_provider"
        }
      );
      throw new NoEligiblePlacementCandidateError();
    }

    const decisionLog = PlacementDecisionLog.recordSelection({
      organizationId: organizationId.value,
      environment: request.environment,
      filters: requirements.toSnapshot(),
      candidateCount: candidates.length,
      selectedProviderNodeId: selectedCandidate.providerNodeId,
      selectedProviderOrganizationId: selectedCandidate.providerOrganizationId,
      createdAt: occurredAt
    });

    await this.repository.createPlacementDecisionLog(decisionLog);
    await this.recordAuditEvent(
      decisionLog.id,
      organizationId.value,
      request,
      occurredAt,
      {
        candidateCount: candidates.length,
        selectedProviderNodeId: selectedCandidate.providerNodeId
      }
    );

    return {
      decisionLogId: decisionLog.id,
      candidateCount: candidates.length,
      selection: selectedCandidate.toSelectionSnapshot()
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }

  private async recordAuditEvent(
    decisionLogId: string,
    organizationId: string,
    request: ResolveSyncPlacementRequest,
    occurredAt: Date,
    outcome: {
      candidateCount: number;
      selectedProviderNodeId?: string;
      rejectionReason?: string;
    }
  ): Promise<void> {
    await this.auditLog.record({
      eventName: "placement.sync.decision.logged",
      occurredAt: occurredAt.toISOString(),
      actorUserId: organizationId,
      organizationId,
      metadata: {
        decisionLogId,
        environment: request.environment,
        gpuClass: request.gpuClass.trim().toLowerCase(),
        minVramGb: request.minVramGb,
        region: request.region,
        minimumTrustTier: request.minimumTrustTier,
        maxPriceUsdPerHour: request.maxPriceUsdPerHour,
        candidateCount: outcome.candidateCount,
        selectedProviderNodeId: outcome.selectedProviderNodeId ?? null,
        rejectionReason: outcome.rejectionReason ?? null
      }
    });
  }
}
