import { DomainValidationError } from "./DomainValidationError.js";

export class OrganizationName {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): OrganizationName {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 3 || normalizedValue.length > 120) {
      throw new DomainValidationError(
        "Organization name must be between 3 and 120 characters."
      );
    }

    return new OrganizationName(normalizedValue);
  }
}
