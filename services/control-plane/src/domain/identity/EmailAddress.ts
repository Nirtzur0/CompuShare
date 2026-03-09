import { DomainValidationError } from "./DomainValidationError.js";

export class EmailAddress {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): EmailAddress {
    const normalizedValue = rawValue.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedValue)) {
      throw new DomainValidationError("Email address must be valid.");
    }

    return new EmailAddress(normalizedValue);
  }
}
