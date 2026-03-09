import type { EmailAddress } from "../../../domain/identity/EmailAddress.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { OrganizationInvitation } from "../../../domain/identity/OrganizationInvitation.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { User } from "../../../domain/identity/User.js";
import type { UserId } from "../../../domain/identity/UserId.js";

export interface OrganizationInvitationRepository {
  findUserByEmail(email: EmailAddress): Promise<User | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  pendingInvitationExists(
    organizationId: OrganizationId,
    inviteeEmail: EmailAddress
  ): Promise<boolean>;
  createInvitation(invitation: OrganizationInvitation): Promise<void>;
  findPendingInvitationByTokenHash(
    tokenHash: string
  ): Promise<OrganizationInvitation | null>;
  acceptInvitation(
    invitation: OrganizationInvitation,
    user: User,
    acceptedAt: Date
  ): Promise<User>;
}
