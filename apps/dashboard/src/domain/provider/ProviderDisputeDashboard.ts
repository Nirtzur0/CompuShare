export interface ProviderDisputeDashboardSnapshot {
  organizationId: string;
  actorRole: "owner" | "admin" | "developer" | "finance";
  activeDisputeCount: number;
  activeDisputeHoldUsd: string;
  recentLostDisputeCount90d: number;
  disputes: {
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
  }[];
}

export class ProviderDisputeDashboard {
  private constructor(
    private readonly snapshot: ProviderDisputeDashboardSnapshot,
  ) {}

  public static create(
    snapshot: ProviderDisputeDashboardSnapshot,
  ): ProviderDisputeDashboard {
    return new ProviderDisputeDashboard(snapshot);
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

  public get title(): string {
    return `Provider disputes for ${this.snapshot.organizationId}`;
  }

  public get actorRole(): ProviderDisputeDashboardSnapshot["actorRole"] {
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

  public get recentLostDisputeCount90d(): number {
    return this.snapshot.recentLostDisputeCount90d;
  }

  public get disputes(): readonly ProviderDisputeDashboardSnapshot["disputes"][number][] {
    return this.snapshot.disputes;
  }
}
