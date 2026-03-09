import { DomainValidationError } from "./DomainValidationError.js";
import { EmailAddress } from "./EmailAddress.js";
import { OrganizationId } from "./OrganizationId.js";
import { OrganizationInvitationId } from "./OrganizationInvitationId.js";
import {
  parseOrganizationRole,
  type OrganizationRole
} from "./OrganizationRole.js";
import { UserId } from "./UserId.js";

export interface OrganizationInvitationSnapshot {
  id: string;
  organizationId: string;
  inviteeEmail: string;
  role: OrganizationRole;
  invitedByUserId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
}

export class OrganizationInvitation {
  private constructor(
    public readonly id: OrganizationInvitationId,
    public readonly organizationId: OrganizationId,
    public readonly inviteeEmail: EmailAddress,
    public readonly role: OrganizationRole,
    public readonly invitedByUserId: UserId,
    public readonly tokenHash: string,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
    public readonly acceptedAt: Date | null,
    public readonly acceptedByUserId: UserId | null
  ) {}

  public static issue(input: {
    organizationId: string;
    inviteeEmail: string;
    role: string;
    invitedByUserId: string;
    tokenHash: string;
    createdAt: Date;
    expiresAt: Date;
  }): OrganizationInvitation {
    OrganizationInvitation.assertValidLifetime(
      input.createdAt,
      input.expiresAt
    );

    return new OrganizationInvitation(
      OrganizationInvitationId.create(),
      OrganizationId.create(input.organizationId),
      EmailAddress.create(input.inviteeEmail),
      parseOrganizationRole(input.role),
      UserId.create(input.invitedByUserId),
      OrganizationInvitation.normalizeTokenHash(input.tokenHash),
      input.createdAt,
      input.expiresAt,
      null,
      null
    );
  }

  public static rehydrate(input: {
    id: string;
    organizationId: string;
    inviteeEmail: string;
    role: string;
    invitedByUserId: string;
    tokenHash: string;
    createdAt: Date;
    expiresAt: Date;
    acceptedAt: Date | null;
    acceptedByUserId: string | null;
  }): OrganizationInvitation {
    OrganizationInvitation.assertValidLifetime(
      input.createdAt,
      input.expiresAt
    );

    return new OrganizationInvitation(
      OrganizationInvitationId.create(input.id),
      OrganizationId.create(input.organizationId),
      EmailAddress.create(input.inviteeEmail),
      parseOrganizationRole(input.role),
      UserId.create(input.invitedByUserId),
      OrganizationInvitation.normalizeTokenHash(input.tokenHash),
      input.createdAt,
      input.expiresAt,
      input.acceptedAt,
      input.acceptedByUserId === null
        ? null
        : UserId.create(input.acceptedByUserId)
    );
  }

  public isExpired(at: Date): boolean {
    return this.expiresAt.getTime() <= at.getTime();
  }

  public isAccepted(): boolean {
    return this.acceptedAt !== null;
  }

  public toSnapshot(): OrganizationInvitationSnapshot {
    return {
      id: this.id.value,
      organizationId: this.organizationId.value,
      inviteeEmail: this.inviteeEmail.value,
      role: this.role,
      invitedByUserId: this.invitedByUserId.value,
      tokenHash: this.tokenHash,
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
      acceptedAt: this.acceptedAt?.toISOString() ?? null,
      acceptedByUserId: this.acceptedByUserId?.value ?? null
    };
  }

  private static assertValidLifetime(createdAt: Date, expiresAt: Date): void {
    if (expiresAt.getTime() <= createdAt.getTime()) {
      throw new DomainValidationError(
        "Invitation expiry must be later than creation time."
      );
    }
  }

  private static normalizeTokenHash(tokenHash: string): string {
    const normalizedValue = tokenHash.trim().toLowerCase();

    if (!/^[a-f0-9]{64}$/u.test(normalizedValue)) {
      throw new DomainValidationError(
        "Invitation token hash must be a 64-character lowercase hex string."
      );
    }

    return normalizedValue;
  }
}
