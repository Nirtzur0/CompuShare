import { randomUUID } from "node:crypto";

export class OrganizationApiKeyId {
  private constructor(public readonly value: string) {}

  public static create(value: string = randomUUID()): OrganizationApiKeyId {
    return new OrganizationApiKeyId(value);
  }
}
