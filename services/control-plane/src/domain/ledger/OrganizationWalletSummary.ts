import { OrganizationId } from "../identity/OrganizationId.js";
import { UsdAmount } from "./UsdAmount.js";

export interface OrganizationWalletSummarySnapshot {
  organizationId: string;
  usageBalanceUsd: string;
  spendCreditsUsd: string;
  pendingEarningsUsd: string;
  withdrawableCashUsd: string;
}

export class OrganizationWalletSummary {
  private constructor(
    public readonly organizationId: OrganizationId,
    public readonly usageBalance: UsdAmount,
    public readonly spendCredits: UsdAmount,
    public readonly pendingEarnings: UsdAmount,
    public readonly withdrawableCash: UsdAmount
  ) {}

  public static create(input: {
    organizationId: string;
    usageBalanceCents?: number;
    spendCreditsCents?: number;
    pendingEarningsCents?: number;
    withdrawableCashCents?: number;
  }): OrganizationWalletSummary {
    return new OrganizationWalletSummary(
      OrganizationId.create(input.organizationId),
      UsdAmount.createFromCents(input.usageBalanceCents ?? 0),
      UsdAmount.createFromCents(input.spendCreditsCents ?? 0),
      UsdAmount.createFromCents(input.pendingEarningsCents ?? 0),
      UsdAmount.createFromCents(input.withdrawableCashCents ?? 0)
    );
  }

  public toSnapshot(): OrganizationWalletSummarySnapshot {
    return {
      organizationId: this.organizationId.value,
      usageBalanceUsd: this.usageBalance.toUsdString(),
      spendCreditsUsd: this.spendCredits.toUsdString(),
      pendingEarningsUsd: this.pendingEarnings.toUsdString(),
      withdrawableCashUsd: this.withdrawableCash.toUsdString()
    };
  }
}
