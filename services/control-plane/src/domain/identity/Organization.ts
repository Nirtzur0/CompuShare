import {
  OrganizationAccountProfile,
  type AccountCapability
} from "./AccountCapability.js";
import { DomainValidationError } from "./DomainValidationError.js";
import { OrganizationId } from "./OrganizationId.js";
import {
  OrganizationMember,
  type OrganizationMemberSnapshot
} from "./OrganizationMember.js";
import { OrganizationName } from "./OrganizationName.js";
import { OrganizationSlug } from "./OrganizationSlug.js";
import type { User } from "./User.js";

export interface OrganizationSnapshot {
  id: string;
  name: string;
  slug: string;
  accountCapabilities: AccountCapability[];
  members: OrganizationMemberSnapshot[];
  createdAt: string;
}

export class Organization {
  private constructor(
    public readonly id: OrganizationId,
    public readonly name: OrganizationName,
    public readonly slug: OrganizationSlug,
    public readonly accountProfile: OrganizationAccountProfile,
    public readonly members: readonly OrganizationMember[],
    public readonly createdAt: Date
  ) {}

  public static createNew(input: {
    name: string;
    slug: OrganizationSlug;
    accountCapabilities: readonly string[];
    founder: User;
    createdAt: Date;
  }): Organization {
    const founderMembership = OrganizationMember.createFounder(
      input.founder.id,
      input.createdAt
    );

    return new Organization(
      OrganizationId.create(),
      OrganizationName.create(input.name),
      input.slug,
      OrganizationAccountProfile.create(input.accountCapabilities),
      [founderMembership],
      input.createdAt
    );
  }

  public static rehydrate(input: {
    id: string;
    name: string;
    slug: string;
    accountCapabilities: readonly string[];
    members: readonly OrganizationMember[];
    createdAt: Date;
  }): Organization {
    Organization.assertHasOwner(input.members);

    return new Organization(
      OrganizationId.create(input.id),
      OrganizationName.create(input.name),
      OrganizationSlug.create(input.slug),
      OrganizationAccountProfile.create(input.accountCapabilities),
      input.members,
      input.createdAt
    );
  }

  public toSnapshot(): OrganizationSnapshot {
    return {
      id: this.id.value,
      name: this.name.value,
      slug: this.slug.value,
      accountCapabilities: this.accountProfile.toArray(),
      members: this.members.map((member) => member.toSnapshot()),
      createdAt: this.createdAt.toISOString()
    };
  }

  private static assertHasOwner(members: readonly OrganizationMember[]): void {
    if (!members.some((member) => member.role === "owner")) {
      throw new DomainValidationError(
        "An organization must always have at least one owner."
      );
    }
  }
}
