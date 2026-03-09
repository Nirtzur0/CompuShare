import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderGpuClass {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): ProviderGpuClass {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 2 || normalizedValue.length > 120) {
      throw new DomainValidationError(
        "Provider GPU class must be between 2 and 120 characters."
      );
    }

    return new ProviderGpuClass(normalizedValue);
  }
}
