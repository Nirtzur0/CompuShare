import { describe, expect, it } from "vitest";
import {
  AcceptOrganizationInvitationUseCase,
  OrganizationInvitationExpiredError,
  OrganizationInvitationNotFoundError,
  OrganizationMembershipConflictError
} from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { OrganizationInvitationRepository } from "../../../src/application/identity/ports/OrganizationInvitationRepository.js";
import { OrganizationInvitation } from "../../../src/domain/identity/OrganizationInvitation.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { User } from "../../../src/domain/identity/User.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryInvitationRepository implements OrganizationInvitationRepository {
  public invitation: OrganizationInvitation | null = null;
  public userByEmail: User | null = null;
  public existingMembership: OrganizationMember | null = null;
  public acceptedAt: Date | null = null;

  public findUserByEmail(): Promise<User | null> {
    return Promise.resolve(this.userByEmail);
  }

  public findOrganizationMember(): Promise<OrganizationMember | null> {
    return Promise.resolve(this.existingMembership);
  }

  public pendingInvitationExists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  public createInvitation(): Promise<void> {
    throw new Error("not used");
  }

  public findPendingInvitationByTokenHash(): Promise<OrganizationInvitation | null> {
    return Promise.resolve(this.invitation);
  }

  public acceptInvitation(
    _: OrganizationInvitation,
    user: User,
    acceptedAt: Date
  ): Promise<User> {
    this.acceptedAt = acceptedAt;
    this.userByEmail = user;
    return Promise.resolve(user);
  }
}

function createPendingInvitation(expiresAt: string): OrganizationInvitation {
  return OrganizationInvitation.issue({
    organizationId: "b9dcb0e6-a2a8-42d7-b29a-f7fb44dd4ac1",
    inviteeEmail: "invitee@example.com",
    role: "developer",
    invitedByUserId: "b4613e0b-ffbb-4790-a202-a63de39b8a0a",
    tokenHash:
      "8fc16af57b335f740b3f16fd355b2be9e5936ff83c28538f1e882f3817d92ab2",
    createdAt: new Date("2026-03-09T00:00:00.000Z"),
    expiresAt: new Date(expiresAt)
  });
}

describe("AcceptOrganizationInvitationUseCase", () => {
  it("accepts a pending invitation and creates membership for a new user", async () => {
    const repository = new InMemoryInvitationRepository();
    repository.invitation = createPendingInvitation("2026-03-16T00:00:00.000Z");
    const auditLog = new RecordingAuditLog();
    const useCase = new AcceptOrganizationInvitationUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T00:00:00.000Z")
    );

    const response = await useCase.execute({
      invitationToken: "accept-invite-token-0001",
      inviteeDisplayName: "Accepted User"
    });

    expect(response).toMatchObject({
      organizationId: "b9dcb0e6-a2a8-42d7-b29a-f7fb44dd4ac1",
      membership: {
        email: "invitee@example.com",
        displayName: "Accepted User",
        role: "developer",
        joinedAt: "2026-03-10T00:00:00.000Z"
      }
    });
    expect(repository.acceptedAt?.toISOString()).toBe(
      "2026-03-10T00:00:00.000Z"
    );
    expect(auditLog.events).toEqual([
      expect.objectContaining({
        eventName: "identity.organization.invitation.accepted"
      })
    ]);
  });

  it("rejects invalid or unknown invitation tokens", async () => {
    const useCase = new AcceptOrganizationInvitationUseCase(
      new InMemoryInvitationRepository(),
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        invitationToken: "accept-invite-token-0001",
        inviteeDisplayName: "Accepted User"
      })
    ).rejects.toBeInstanceOf(OrganizationInvitationNotFoundError);
  });

  it("rejects expired invitations", async () => {
    const repository = new InMemoryInvitationRepository();
    repository.invitation = createPendingInvitation("2026-03-09T12:00:00.000Z");
    const useCase = new AcceptOrganizationInvitationUseCase(
      repository,
      new RecordingAuditLog(),
      () => new Date("2026-03-10T00:00:00.000Z")
    );

    await expect(
      useCase.execute({
        invitationToken: "accept-invite-token-0001",
        inviteeDisplayName: "Accepted User"
      })
    ).rejects.toBeInstanceOf(OrganizationInvitationExpiredError);
  });

  it("rejects acceptance when the invited email is already a member", async () => {
    const repository = new InMemoryInvitationRepository();
    repository.invitation = createPendingInvitation("2026-03-16T00:00:00.000Z");
    repository.userByEmail = User.rehydrate({
      id: "6ebf9ad8-65d1-475d-88dd-4c4f64c2e565",
      email: "invitee@example.com",
      displayName: "Existing User",
      createdAt: new Date("2026-03-09T00:00:00.000Z")
    });
    repository.existingMembership = OrganizationMember.rehydrate({
      userId: "6ebf9ad8-65d1-475d-88dd-4c4f64c2e565",
      role: "developer",
      joinedAt: new Date("2026-03-09T01:00:00.000Z")
    });
    const useCase = new AcceptOrganizationInvitationUseCase(
      repository,
      new RecordingAuditLog(),
      () => new Date("2026-03-10T00:00:00.000Z")
    );

    await expect(
      useCase.execute({
        invitationToken: "accept-invite-token-0001",
        inviteeDisplayName: "Accepted User"
      })
    ).rejects.toBeInstanceOf(OrganizationMembershipConflictError);
  });
});
