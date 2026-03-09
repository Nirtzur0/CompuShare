import { randomUUID } from "node:crypto";

export class ProviderBenchmarkId {
  private constructor(public readonly value: string) {}

  public static create(value: string = randomUUID()): ProviderBenchmarkId {
    return new ProviderBenchmarkId(value);
  }
}
