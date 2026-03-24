export interface ConsumerDisputeDashboardSnapshot {
  organizationId: string;
  actorRole: "owner" | "admin" | "developer" | "finance";
  activeDisputeCount: number;
  activeDisputeHoldUsd: string;
  disputes: {
    id: string;
    disputeType: "settlement" | "chargeback";
    source: "manual" | "stripe_webhook";
    status: "open" | "under_review" | "won" | "lost" | "recovered" | "canceled";
    paymentReference: string | null;
    jobReference: string | null;
    disputedAmountUsd: string;
    allocatedAmountUsd: string;
    activeHoldUsd: string;
    reasonCode: string;
    summary: string;
    stripeDisputeId: string | null;
    stripeChargeId: string | null;
    stripeReason: string | null;
    stripeStatus: string | null;
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    evidenceEntries: {
      label: string;
      value: string;
    }[];
    allocations: {
      providerOrganizationId: string;
      amountUsd: string;
    }[];
  }[];
}

export class ConsumerDisputeDashboard {
  private constructor(
    private readonly snapshot: ConsumerDisputeDashboardSnapshot,
  ) {}

  public static create(
    snapshot: ConsumerDisputeDashboardSnapshot,
  ): ConsumerDisputeDashboard {
    return new ConsumerDisputeDashboard(snapshot);
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

  public get title(): string {
    return `Buyer disputes for ${this.snapshot.organizationId}`;
  }

  public get actorRole(): ConsumerDisputeDashboardSnapshot["actorRole"] {
    return this.snapshot.actorRole;
  }

  public get organizationId(): string {
    return this.snapshot.organizationId;
  }

  public get activeDisputeCount(): number {
    return this.snapshot.activeDisputeCount;
  }

  public get activeDisputeHoldUsd(): string {
    return this.snapshot.activeDisputeHoldUsd;
  }

  public get disputes(): readonly ConsumerDisputeDashboardSnapshot["disputes"][number][] {
    return this.snapshot.disputes;
  }
}
