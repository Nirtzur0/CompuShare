import { randomUUID } from "node:crypto";

export class ProviderNodeId {
  private constructor(public readonly value: string) {}

  public static create(value: string = randomUUID()): ProviderNodeId {
    return new ProviderNodeId(value);
  }
}
