import type { OrganizationRole } from "../identity/OrganizationRole.js";
import type { ProviderDisputeCaseSnapshot } from "../dispute/ProviderDisputeCase.js";

export interface ConsumerDisputeDashboardDisputeSnapshot
  extends ProviderDisputeCaseSnapshot {
  allocatedAmountUsd: string;
  activeHoldUsd: string;
}

export interface ConsumerDisputeDashboardSnapshot {
  organizationId: string;
  actorRole: OrganizationRole;
  activeDisputeCount: number;
  activeDisputeHoldUsd: string;
  disputes: ConsumerDisputeDashboardDisputeSnapshot[];
}

export class ConsumerDisputeDashboard {
  private constructor(private readonly snapshot: ConsumerDisputeDashboardSnapshot) {}

  public static create(input: ConsumerDisputeDashboardSnapshot): ConsumerDisputeDashboard {
    return new ConsumerDisputeDashboard(input);
  }

  public toSnapshot(): ConsumerDisputeDashboardSnapshot {
    return {
      organizationId: this.snapshot.organizationId,
      actorRole: this.snapshot.actorRole,
      activeDisputeCount: this.snapshot.activeDisputeCount,
      activeDisputeHoldUsd: this.snapshot.activeDisputeHoldUsd,
      disputes: this.snapshot.disputes.map((dispute) => ({
        ...dispute,
        evidenceEntries: dispute.evidenceEntries.map((entry) => ({ ...entry })),
        allocations: dispute.allocations.map((allocation) => ({ ...allocation })),
      })),
    };
  }
}
