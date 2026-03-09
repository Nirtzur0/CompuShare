import { describe, expect, it } from "vitest";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { OrganizationMembershipRepository } from "../../../src/application/identity/ports/OrganizationMembershipRepository.js";
import {
  OrganizationMemberNotFoundError,
  OrganizationMemberRoleAuthorizationError,
  OrganizationOwnerInvariantError,
  UpdateOrganizationMemberRoleUseCase
} from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import type { OrganizationRole } from "../../../src/domain/identity/OrganizationRole.js";
import type { UserId } from "../../../src/domain/identity/UserId.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryMembershipRepository implements OrganizationMembershipRepository {
  public actorMembership: OrganizationMember | null = null;
  public targetMembership: OrganizationMember | null = null;
  public ownerCount = 1;

  public findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null> {
    void organizationId;
    if (this.actorMembership?.userId.value === userId.value) {
      return Promise.resolve(this.actorMembership);
    }

    if (this.targetMembership?.userId.value === userId.value) {
      return Promise.resolve(this.targetMembership);
    }

    return Promise.resolve(null);
  }

  public countOrganizationOwners(
    organizationId: OrganizationId
  ): Promise<number> {
    void organizationId;
    return Promise.resolve(this.ownerCount);
  }

  public updateOrganizationMemberRole(
    organizationId: OrganizationId,
    userId: UserId,
    nextRole: OrganizationRole
  ): Promise<OrganizationMember> {
    void organizationId;
    if (this.targetMembership?.userId.value !== userId.value) {
      throw new Error("target membership missing");
    }

    this.targetMembership = this.targetMembership.withRole(nextRole);
    return Promise.resolve(this.targetMembership);
  }
}

describe("UpdateOrganizationMemberRoleUseCase", () => {
  it("allows owners to update member roles and records an audit event", async () => {
    const repository = new InMemoryMembershipRepository();
    repository.actorMembership = OrganizationMember.rehydrate({
      userId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
      role: "owner",
      joinedAt: new Date("2026-03-09T00:00:00.000Z")
    });
    repository.targetMembership = OrganizationMember.rehydrate({
      userId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
      role: "developer",
      joinedAt: new Date("2026-03-09T01:00:00.000Z")
    });
    const auditLog = new RecordingAuditLog();
    const useCase = new UpdateOrganizationMemberRoleUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T00:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "731f9dd0-d6c0-4cb4-9cb1-b3991e1aef7f",
      actorUserId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
      targetUserId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
      nextRole: "finance"
    });

    expect(response).toEqual({
      membership: {
        userId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
        role: "finance",
        joinedAt: "2026-03-09T01:00:00.000Z"
      }
    });
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]?.eventName).toBe(
      "identity.organization.member.role.updated"
    );
    expect(auditLog.events[0]?.metadata.previousRole).toBe("developer");
    expect(auditLog.events[0]?.metadata.nextRole).toBe("finance");
  });

  it("rejects actors without member-management authority", async () => {
    const repository = new InMemoryMembershipRepository();
    repository.actorMembership = OrganizationMember.rehydrate({
      userId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
      role: "developer",
      joinedAt: new Date("2026-03-09T00:00:00.000Z")
    });
    repository.targetMembership = OrganizationMember.rehydrate({
      userId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
      role: "finance",
      joinedAt: new Date("2026-03-09T01:00:00.000Z")
    });
    const useCase = new UpdateOrganizationMemberRoleUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "731f9dd0-d6c0-4cb4-9cb1-b3991e1aef7f",
        actorUserId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
        targetUserId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
        nextRole: "admin"
      })
    ).rejects.toBeInstanceOf(OrganizationMemberRoleAuthorizationError);
  });

  it("rejects actors that are not members of the organization", async () => {
    const repository = new InMemoryMembershipRepository();
    repository.targetMembership = OrganizationMember.rehydrate({
      userId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
      role: "finance",
      joinedAt: new Date("2026-03-09T01:00:00.000Z")
    });
    const useCase = new UpdateOrganizationMemberRoleUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "731f9dd0-d6c0-4cb4-9cb1-b3991e1aef7f",
        actorUserId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
        targetUserId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
        nextRole: "admin"
      })
    ).rejects.toBeInstanceOf(OrganizationMemberRoleAuthorizationError);
  });

  it("rejects admin attempts to mutate owner memberships", async () => {
    const repository = new InMemoryMembershipRepository();
    repository.actorMembership = OrganizationMember.rehydrate({
      userId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
      role: "admin",
      joinedAt: new Date("2026-03-09T00:00:00.000Z")
    });
    repository.targetMembership = OrganizationMember.rehydrate({
      userId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
      role: "owner",
      joinedAt: new Date("2026-03-09T01:00:00.000Z")
    });
    const useCase = new UpdateOrganizationMemberRoleUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "731f9dd0-d6c0-4cb4-9cb1-b3991e1aef7f",
        actorUserId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
        targetUserId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
        nextRole: "developer"
      })
    ).rejects.toBeInstanceOf(OrganizationMemberRoleAuthorizationError);
  });

  it("rejects mutation when the target member does not exist", async () => {
    const repository = new InMemoryMembershipRepository();
    repository.actorMembership = OrganizationMember.rehydrate({
      userId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
      role: "owner",
      joinedAt: new Date("2026-03-09T00:00:00.000Z")
    });
    const useCase = new UpdateOrganizationMemberRoleUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "731f9dd0-d6c0-4cb4-9cb1-b3991e1aef7f",
        actorUserId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
        targetUserId: "5ad295e7-9bf8-4a84-b7e1-e06cc86fb7a9",
        nextRole: "developer"
      })
    ).rejects.toBeInstanceOf(OrganizationMemberNotFoundError);
  });

  it("rejects demotion of the last remaining owner", async () => {
    const repository = new InMemoryMembershipRepository();
    repository.actorMembership = OrganizationMember.rehydrate({
      userId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
      role: "owner",
      joinedAt: new Date("2026-03-09T00:00:00.000Z")
    });
    repository.targetMembership = OrganizationMember.rehydrate({
      userId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
      role: "owner",
      joinedAt: new Date("2026-03-09T00:00:00.000Z")
    });
    repository.ownerCount = 1;
    const useCase = new UpdateOrganizationMemberRoleUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "731f9dd0-d6c0-4cb4-9cb1-b3991e1aef7f",
        actorUserId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
        targetUserId: "ae52f85f-3fe1-4020-be7f-7f9dd7287d40",
        nextRole: "admin"
      })
    ).rejects.toBeInstanceOf(OrganizationOwnerInvariantError);
  });
});
