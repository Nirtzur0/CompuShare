import { UsdAmount } from "../ledger/UsdAmount.js";

export interface ConsumerSpendSummarySnapshot {
  lifetimeFundedUsd: string;
  lifetimeSettledSpendUsd: string;
}

export class ConsumerSpendSummary {
  private constructor(
    public readonly lifetimeFunded: UsdAmount,
    public readonly lifetimeSettledSpend: UsdAmount
  ) {}

  public static create(input: {
    lifetimeFundedCents?: number;
    lifetimeSettledSpendCents?: number;
  }): ConsumerSpendSummary {
    return new ConsumerSpendSummary(
      UsdAmount.createFromCents(input.lifetimeFundedCents ?? 0),
      UsdAmount.createFromCents(input.lifetimeSettledSpendCents ?? 0)
    );
  }

  public toSnapshot(): ConsumerSpendSummarySnapshot {
    return {
      lifetimeFundedUsd: this.lifetimeFunded.toUsdString(),
      lifetimeSettledSpendUsd: this.lifetimeSettledSpend.toUsdString()
    };
  }
}
