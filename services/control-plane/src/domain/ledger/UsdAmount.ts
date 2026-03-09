import { DomainValidationError } from "../identity/DomainValidationError.js";

const usdAmountPattern = /^(0|[1-9]\d*)(\.\d{1,2})?$/u;

export class UsdAmount {
  private constructor(public readonly cents: number) {}

  public static zero(): UsdAmount {
    return new UsdAmount(0);
  }

  public static createFromCents(cents: number): UsdAmount {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new DomainValidationError(
        "USD amounts must be non-negative safe integers in cents."
      );
    }

    return new UsdAmount(cents);
  }

  public static parse(rawValue: string): UsdAmount {
    if (!usdAmountPattern.test(rawValue)) {
      throw new DomainValidationError(
        `USD amount "${rawValue}" must be a non-negative decimal with at most 2 fractional digits.`
      );
    }

    const parts = rawValue.split(".");
    const wholePart = parts[0];
    const fractionalPart = parts[1] ?? "";

    if (wholePart === undefined) {
      throw new DomainValidationError(`USD amount "${rawValue}" is invalid.`);
    }

    const normalizedFractional = `${fractionalPart}00`.slice(0, 2);
    const cents =
      Number.parseInt(wholePart, 10) * 100 +
      Number.parseInt(normalizedFractional, 10);

    return UsdAmount.createFromCents(cents);
  }

  public add(other: UsdAmount): UsdAmount {
    return UsdAmount.createFromCents(this.cents + other.cents);
  }

  public subtract(other: UsdAmount): UsdAmount {
    if (other.cents > this.cents) {
      throw new DomainValidationError(
        "USD amount subtraction cannot produce a negative balance."
      );
    }

    return UsdAmount.createFromCents(this.cents - other.cents);
  }

  public toUsdString(): string {
    const wholePart = Math.trunc(this.cents / 100);
    const fractionalPart = String(this.cents % 100).padStart(2, "0");

    return `${String(wholePart)}.${fractionalPart}`;
  }
}
