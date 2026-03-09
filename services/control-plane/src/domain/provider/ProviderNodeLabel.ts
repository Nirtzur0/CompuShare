import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderNodeLabel {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): ProviderNodeLabel {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 3 || normalizedValue.length > 120) {
      throw new DomainValidationError(
        "Provider node label must be between 3 and 120 characters."
      );
    }

    return new ProviderNodeLabel(normalizedValue);
  }
}
