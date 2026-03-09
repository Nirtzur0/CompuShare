import { randomBytes } from "node:crypto";
import { EmailAddress } from "../../domain/identity/EmailAddress.js";
import { InvitationToken } from "../../domain/identity/InvitationToken.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { OrganizationInvitation } from "../../domain/identity/OrganizationInvitation.js";
import {
  canManageOrganizationMembers,
  parseOrganizationRole
} from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import type { AuditLog } from "./ports/AuditLog.js";
import type { OrganizationInvitationRepository } from "./ports/OrganizationInvitationRepository.js";

export interface IssueOrganizationInvitationRequest {
  organizationId: string;
  inviterUserId: string;
  inviteeEmail: string;
  role: string;
}

export interface IssueOrganizationInvitationResponse {
  invitation: {
    id: string;
    organizationId: string;
    inviteeEmail: string;
    role: string;
    invitedByUserId: string;
    expiresAt: string;
  };
  token: string;
}

export class OrganizationInvitationAuthorizationError extends Error {
  public constructor() {
    super("Only owner or admin members may invite organization members.");
    this.name = "OrganizationInvitationAuthorizationError";
  }
}

export class PendingOrganizationInvitationConflictError extends Error {
  public constructor(emailAddress: string) {
    super(`A pending invitation already exists for "${emailAddress}".`);
    this.name = "PendingOrganizationInvitationConflictError";
  }
}

export class IssueOrganizationInvitationUseCase {
  public constructor(
    private readonly repository: OrganizationInvitationRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
    private readonly tokenGenerator: () => string = () =>
      randomBytes(24).toString("base64url")
  ) {}

  public async execute(
    request: IssueOrganizationInvitationRequest
  ): Promise<IssueOrganizationInvitationResponse> {
    const requestedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const inviterUserId = UserId.create(request.inviterUserId);
    const inviteeEmail = EmailAddress.create(request.inviteeEmail);
    const role = parseOrganizationRole(request.role);

    const inviterMembership = await this.repository.findOrganizationMember(
      organizationId,
      inviterUserId
    );

    if (
      inviterMembership === null ||
      !canManageOrganizationMembers(inviterMembership.role)
    ) {
      throw new OrganizationInvitationAuthorizationError();
    }

    if (
      await this.repository.pendingInvitationExists(
        organizationId,
        inviteeEmail
      )
    ) {
      throw new PendingOrganizationInvitationConflictError(inviteeEmail.value);
    }

    const invitationToken = InvitationToken.create(this.tokenGenerator());
    const expiresAt = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const invitation = OrganizationInvitation.issue({
      organizationId: organizationId.value,
      inviteeEmail: inviteeEmail.value,
      role,
      invitedByUserId: inviterUserId.value,
      tokenHash: invitationToken.toHash(),
      createdAt: requestedAt,
      expiresAt
    });

    await this.repository.createInvitation(invitation);
    await this.auditLog.record({
      eventName: "identity.organization.invitation.issued",
      occurredAt: requestedAt.toISOString(),
      actorUserId: inviterUserId.value,
      organizationId: organizationId.value,
      metadata: {
        inviteeEmail: inviteeEmail.value,
        role
      }
    });

    return {
      invitation: {
        id: invitation.id.value,
        organizationId: organizationId.value,
        inviteeEmail: inviteeEmail.value,
        role,
        invitedByUserId: inviterUserId.value,
        expiresAt: expiresAt.toISOString()
      },
      token: invitationToken.value
    };
  }
}
