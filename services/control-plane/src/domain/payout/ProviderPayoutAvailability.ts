import { OrganizationId } from "../identity/OrganizationId.js";
import { UsdAmount } from "../ledger/UsdAmount.js";

export type ProviderPayoutSettlementStatus =
  | "none"
  | "pending"
  | "paid"
  | "failed"
  | "canceled";

export interface ProviderPayoutAvailabilitySnapshot {
  organizationId: string;
  pendingEarningsUsd: string;
  reserveHoldbackUsd: string;
  withdrawableCashUsd: string;
  activeDisputeHoldUsd: string;
  eligiblePayoutUsd: string;
  lastPayoutAt: string | null;
  lastPayoutStatus: ProviderPayoutSettlementStatus;
}

export class ProviderPayoutAvailability {
  private constructor(
    public readonly organizationId: OrganizationId,
    public readonly pendingEarnings: UsdAmount,
    public readonly reserveHoldback: UsdAmount,
    public readonly withdrawableCash: UsdAmount,
    public readonly activeDisputeHold: UsdAmount,
    public readonly eligiblePayout: UsdAmount,
    public readonly lastPayoutAt: Date | null,
    public readonly lastPayoutStatus: ProviderPayoutSettlementStatus
  ) {}

  public static create(input: {
    organizationId: string;
    pendingEarningsCents: number;
    reserveHoldbackCents: number;
    withdrawableCashCents: number;
    activeDisputeHoldCents: number;
    eligiblePayoutCents: number;
    lastPayoutAt: Date | null;
    lastPayoutStatus: ProviderPayoutSettlementStatus;
  }): ProviderPayoutAvailability {
    return new ProviderPayoutAvailability(
      OrganizationId.create(input.organizationId),
      UsdAmount.createFromCents(input.pendingEarningsCents),
      UsdAmount.createFromCents(input.reserveHoldbackCents),
      UsdAmount.createFromCents(input.withdrawableCashCents),
      UsdAmount.createFromCents(input.activeDisputeHoldCents),
      UsdAmount.createFromCents(input.eligiblePayoutCents),
      input.lastPayoutAt,
      input.lastPayoutStatus
    );
  }

  public toSnapshot(): ProviderPayoutAvailabilitySnapshot {
    return {
      organizationId: this.organizationId.value,
      pendingEarningsUsd: this.pendingEarnings.toUsdString(),
      reserveHoldbackUsd: this.reserveHoldback.toUsdString(),
      withdrawableCashUsd: this.withdrawableCash.toUsdString(),
      activeDisputeHoldUsd: this.activeDisputeHold.toUsdString(),
      eligiblePayoutUsd: this.eligiblePayout.toUsdString(),
      lastPayoutAt: this.lastPayoutAt?.toISOString() ?? null,
      lastPayoutStatus: this.lastPayoutStatus
    };
  }
}
