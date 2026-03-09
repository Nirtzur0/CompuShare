import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderPriceFloorUsdPerHour {
  private constructor(public readonly value: number) {}

  public static create(raw: number): ProviderPriceFloorUsdPerHour {
    if (!Number.isFinite(raw)) {
      throw new DomainValidationError(
        "Provider price floor must be a finite USD/hour amount."
      );
    }

    if (raw <= 0 || raw > 1_000_000) {
      throw new DomainValidationError(
        "Provider price floor must be greater than 0 and at most 1000000 USD/hour."
      );
    }

    return new ProviderPriceFloorUsdPerHour(Number(raw.toFixed(6)));
  }
}
