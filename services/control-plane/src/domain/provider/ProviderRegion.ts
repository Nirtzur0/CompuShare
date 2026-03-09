import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderRegion {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): ProviderRegion {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 2 || normalizedValue.length > 64) {
      throw new DomainValidationError(
        "Provider region must be between 2 and 64 characters."
      );
    }

    return new ProviderRegion(normalizedValue);
  }
}
