import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderThroughputBaseline {
  private constructor(public readonly value: number) {}

  public static create(rawValue: number): ProviderThroughputBaseline {
    if (!Number.isFinite(rawValue) || rawValue <= 0 || rawValue > 1_000_000) {
      throw new DomainValidationError(
        "Provider throughput baseline must be a finite number greater than 0 and at most 1000000."
      );
    }

    return new ProviderThroughputBaseline(rawValue);
  }
}
