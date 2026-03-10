import { DomainValidationError } from "../domain/identity/DomainValidationError.js";

export class FraudDetectionPolicy {
  private constructor(
    public readonly minimumLookbackDays: number,
    public readonly maximumLookbackDays: number,
    public readonly defaultLookbackDays: number,
    public readonly minimumSettledUsdForMissingUsageCents: number,
    public readonly minimumSettledUsdForConcentrationCents: number,
    public readonly minimumSettlementCountForConcentration: number,
    public readonly counterpartyShareThreshold: number
  ) {}

  public static createDefault(): FraudDetectionPolicy {
    return new FraudDetectionPolicy(7, 90, 30, 2_500, 5_000, 3, 0.85);
  }

  public resolveLookbackDays(requestedLookbackDays?: number): number {
    const lookbackDays = requestedLookbackDays ?? this.defaultLookbackDays;

    if (
      !Number.isInteger(lookbackDays) ||
      lookbackDays < this.minimumLookbackDays ||
      lookbackDays > this.maximumLookbackDays
    ) {
      throw new DomainValidationError(
        `Fraud review lookback must be an integer between ${String(this.minimumLookbackDays)} and ${String(this.maximumLookbackDays)} days.`
      );
    }

    return lookbackDays;
  }
}
