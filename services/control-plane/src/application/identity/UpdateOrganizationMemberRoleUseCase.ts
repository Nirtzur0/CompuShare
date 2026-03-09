import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import {
  canMutateOrganizationRole,
  parseOrganizationRole
} from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import type { AuditLog } from "./ports/AuditLog.js";
import type { OrganizationMembershipRepository } from "./ports/OrganizationMembershipRepository.js";

export interface UpdateOrganizationMemberRoleRequest {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
  nextRole: string;
}

export interface UpdateOrganizationMemberRoleResponse {
  membership: {
    userId: string;
    role: string;
    joinedAt: string;
  };
}

export class OrganizationMemberRoleAuthorizationError extends Error {
  public constructor() {
    super("Actor is not allowed to change this organization member role.");
    this.name = "OrganizationMemberRoleAuthorizationError";
  }
}

export class OrganizationMemberNotFoundError extends Error {
  public constructor(userId: string) {
    super(`Organization member "${userId}" was not found.`);
    this.name = "OrganizationMemberNotFoundError";
  }
}

export class OrganizationOwnerInvariantError extends Error {
  public constructor() {
    super("An organization must retain at least one owner.");
    this.name = "OrganizationOwnerInvariantError";
  }
}

export class UpdateOrganizationMemberRoleUseCase {
  public constructor(
    private readonly repository: OrganizationMembershipRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: UpdateOrganizationMemberRoleRequest
  ): Promise<UpdateOrganizationMemberRoleResponse> {
    const occurredAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const targetUserId = UserId.create(request.targetUserId);
    const nextRole = parseOrganizationRole(request.nextRole);

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (actorMembership === null) {
      throw new OrganizationMemberRoleAuthorizationError();
    }

    const targetMembership = await this.repository.findOrganizationMember(
      organizationId,
      targetUserId
    );

    if (targetMembership === null) {
      throw new OrganizationMemberNotFoundError(targetUserId.value);
    }

    if (
      !canMutateOrganizationRole({
        actorRole: actorMembership.role,
        targetCurrentRole: targetMembership.role,
        nextRole
      })
    ) {
      throw new OrganizationMemberRoleAuthorizationError();
    }

    if (targetMembership.role === "owner" && nextRole !== "owner") {
      const ownerCount =
        await this.repository.countOrganizationOwners(organizationId);

      if (ownerCount <= 1) {
        throw new OrganizationOwnerInvariantError();
      }
    }

    const updatedMembership =
      await this.repository.updateOrganizationMemberRole(
        organizationId,
        targetUserId,
        nextRole
      );

    await this.auditLog.record({
      eventName: "identity.organization.member.role.updated",
      occurredAt: occurredAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        targetUserId: targetUserId.value,
        previousRole: targetMembership.role,
        nextRole
      }
    });

    return {
      membership: {
        userId: updatedMembership.userId.value,
        role: updatedMembership.role,
        joinedAt: updatedMembership.joinedAt.toISOString()
      }
    };
  }
}
