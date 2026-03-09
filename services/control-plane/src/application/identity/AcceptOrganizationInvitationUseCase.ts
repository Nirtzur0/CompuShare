import { InvitationToken } from "../../domain/identity/InvitationToken.js";
import { User } from "../../domain/identity/User.js";
import type { AuditLog } from "./ports/AuditLog.js";
import type { OrganizationInvitationRepository } from "./ports/OrganizationInvitationRepository.js";

export interface AcceptOrganizationInvitationRequest {
  invitationToken: string;
  inviteeDisplayName: string;
}

export interface AcceptOrganizationInvitationResponse {
  organizationId: string;
  membership: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
    joinedAt: string;
  };
}

export class OrganizationInvitationNotFoundError extends Error {
  public constructor() {
    super("Invitation token is invalid or no pending invitation exists.");
    this.name = "OrganizationInvitationNotFoundError";
  }
}

export class OrganizationInvitationExpiredError extends Error {
  public constructor() {
    super("Invitation has expired.");
    this.name = "OrganizationInvitationExpiredError";
  }
}

export class OrganizationMembershipConflictError extends Error {
  public constructor(emailAddress: string) {
    super(`User "${emailAddress}" is already a member of this organization.`);
    this.name = "OrganizationMembershipConflictError";
  }
}

export class AcceptOrganizationInvitationUseCase {
  public constructor(
    private readonly repository: OrganizationInvitationRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: AcceptOrganizationInvitationRequest
  ): Promise<AcceptOrganizationInvitationResponse> {
    const acceptedAt = this.clock();
    const invitationToken = InvitationToken.create(request.invitationToken);
    const invitation = await this.repository.findPendingInvitationByTokenHash(
      invitationToken.toHash()
    );

    if (invitation === null || invitation.isAccepted()) {
      throw new OrganizationInvitationNotFoundError();
    }

    if (invitation.isExpired(acceptedAt)) {
      throw new OrganizationInvitationExpiredError();
    }

    const existingUser = await this.repository.findUserByEmail(
      invitation.inviteeEmail
    );

    const user =
      existingUser ??
      User.createNew({
        email: invitation.inviteeEmail,
        displayName: request.inviteeDisplayName,
        createdAt: acceptedAt
      });

    if (existingUser !== null) {
      const existingMembership = await this.repository.findOrganizationMember(
        invitation.organizationId,
        existingUser.id
      );

      if (existingMembership !== null) {
        throw new OrganizationMembershipConflictError(existingUser.email.value);
      }
    }

    const persistedUser = await this.repository.acceptInvitation(
      invitation,
      user,
      acceptedAt
    );

    await this.auditLog.record({
      eventName: "identity.organization.invitation.accepted",
      occurredAt: acceptedAt.toISOString(),
      actorUserId: persistedUser.id.value,
      organizationId: invitation.organizationId.value,
      metadata: {
        inviteeEmail: persistedUser.email.value,
        role: invitation.role
      }
    });

    return {
      organizationId: invitation.organizationId.value,
      membership: {
        userId: persistedUser.id.value,
        email: persistedUser.email.value,
        displayName: persistedUser.displayName,
        role: invitation.role,
        joinedAt: acceptedAt.toISOString()
      }
    };
  }
}
