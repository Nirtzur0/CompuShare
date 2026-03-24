import type { OrganizationRole } from "../identity/OrganizationRole.js";

export interface ProviderDisputeDashboardDisputeSnapshot {
  id: string;
  disputeType: "settlement" | "chargeback";
  source: "manual" | "stripe_webhook";
  status: "open" | "under_review" | "won" | "lost" | "recovered" | "canceled";
  paymentReference: string | null;
  jobReference: string | null;
  reasonCode: string;
  summary: string;
  disputedAmountUsd: string;
  allocatedAmountUsd: string;
  activeHoldUsd: string;
  stripeDisputeId: string | null;
  stripeChargeId: string | null;
  stripeReason: string | null;
  stripeStatus: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface ProviderDisputeDashboardSnapshot {
  organizationId: string;
  actorRole: OrganizationRole;
  activeDisputeCount: number;
  activeDisputeHoldUsd: string;
  recentLostDisputeCount90d: number;
  disputes: ProviderDisputeDashboardDisputeSnapshot[];
}

export class ProviderDisputeDashboard {
  private constructor(private readonly snapshot: ProviderDisputeDashboardSnapshot) {}

  public static create(input: ProviderDisputeDashboardSnapshot): ProviderDisputeDashboard {
    return new ProviderDisputeDashboard(input);
  }

  public toSnapshot(): ProviderDisputeDashboardSnapshot {
    return {
      organizationId: this.snapshot.organizationId,
      actorRole: this.snapshot.actorRole,
      activeDisputeCount: this.snapshot.activeDisputeCount,
      activeDisputeHoldUsd: this.snapshot.activeDisputeHoldUsd,
      recentLostDisputeCount90d: this.snapshot.recentLostDisputeCount90d,
      disputes: this.snapshot.disputes.map((dispute) => ({ ...dispute })),
    };
  }
}
