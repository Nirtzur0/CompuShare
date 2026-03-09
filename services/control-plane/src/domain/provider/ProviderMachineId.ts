import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderMachineId {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): ProviderMachineId {
    const normalizedValue = rawValue.trim();

    if (
      normalizedValue.length < 8 ||
      normalizedValue.length > 128 ||
      !/^[A-Za-z0-9._:-]+$/u.test(normalizedValue)
    ) {
      throw new DomainValidationError(
        "Provider machine ID must be 8-128 characters and use letters, numbers, dot, underscore, colon, or dash."
      );
    }

    return new ProviderMachineId(normalizedValue);
  }
}
