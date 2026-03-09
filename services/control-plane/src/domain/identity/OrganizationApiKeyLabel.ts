import { DomainValidationError } from "./DomainValidationError.js";

export class OrganizationApiKeyLabel {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): OrganizationApiKeyLabel {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 3 || normalizedValue.length > 120) {
      throw new DomainValidationError(
        "Organization API key label must be between 3 and 120 characters."
      );
    }

    return new OrganizationApiKeyLabel(normalizedValue);
  }
}
