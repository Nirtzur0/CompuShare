import { DomainValidationError } from "./DomainValidationError.js";

export class OrganizationSlug {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): OrganizationSlug {
    const normalizedValue = rawValue.trim().toLowerCase();

    if (
      !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/u.test(normalizedValue) ||
      normalizedValue.length < 3
    ) {
      throw new DomainValidationError(
        "Organization slug must be 3-63 characters of lowercase letters, numbers, or hyphens."
      );
    }

    return new OrganizationSlug(normalizedValue);
  }
}
