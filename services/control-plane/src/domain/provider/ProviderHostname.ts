import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderHostname {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): ProviderHostname {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 2 || normalizedValue.length > 255) {
      throw new DomainValidationError(
        "Provider hostname must be between 2 and 255 characters."
      );
    }

    return new ProviderHostname(normalizedValue);
  }
}
