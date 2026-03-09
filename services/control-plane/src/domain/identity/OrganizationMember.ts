import type { OrganizationRole } from "./OrganizationRole.js";
import { UserId } from "./UserId.js";

export interface OrganizationMemberSnapshot {
  userId: string;
  role: OrganizationRole;
  joinedAt: string;
}

export class OrganizationMember {
  private constructor(
    public readonly userId: UserId,
    public readonly role: OrganizationRole,
    public readonly joinedAt: Date
  ) {}

  public static createFounder(
    userId: UserId,
    joinedAt: Date
  ): OrganizationMember {
    return new OrganizationMember(userId, "owner", joinedAt);
  }

  public static rehydrate(input: {
    userId: string;
    role: OrganizationRole;
    joinedAt: Date;
  }): OrganizationMember {
    return new OrganizationMember(
      UserId.create(input.userId),
      input.role,
      input.joinedAt
    );
  }

  public toSnapshot(): OrganizationMemberSnapshot {
    return {
      userId: this.userId.value,
      role: this.role,
      joinedAt: this.joinedAt.toISOString()
    };
  }

  public withRole(nextRole: OrganizationRole): OrganizationMember {
    return new OrganizationMember(this.userId, nextRole, this.joinedAt);
  }
}
