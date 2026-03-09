import { randomUUID } from "node:crypto";

export class OrganizationId {
  private constructor(public readonly value: string) {}

  public static create(value: string = randomUUID()): OrganizationId {
    return new OrganizationId(value);
  }
}
