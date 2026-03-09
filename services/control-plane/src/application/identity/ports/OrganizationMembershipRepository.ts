import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationRole } from "../../../domain/identity/OrganizationRole.js";
import type { UserId } from "../../../domain/identity/UserId.js";

export interface OrganizationMembershipRepository {
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  countOrganizationOwners(organizationId: OrganizationId): Promise<number>;
  updateOrganizationMemberRole(
    organizationId: OrganizationId,
    userId: UserId,
    nextRole: OrganizationRole
  ): Promise<OrganizationMember>;
}
