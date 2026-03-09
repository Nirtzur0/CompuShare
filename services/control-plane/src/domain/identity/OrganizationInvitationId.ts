import { randomUUID } from "node:crypto";

export class OrganizationInvitationId {
  private constructor(public readonly value: string) {}

  public static create(value: string = randomUUID()): OrganizationInvitationId {
    return new OrganizationInvitationId(value);
  }
}
