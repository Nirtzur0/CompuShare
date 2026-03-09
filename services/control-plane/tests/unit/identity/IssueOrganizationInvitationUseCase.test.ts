import { describe, expect, it } from "vitest";
import {
  IssueOrganizationInvitationUseCase,
  OrganizationInvitationAuthorizationError,
  PendingOrganizationInvitationConflictError
} from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { OrganizationInvitationRepository } from "../../../src/application/identity/ports/OrganizationInvitationRepository.js";
import type { EmailAddress } from "../../../src/domain/identity/EmailAddress.js";
import type { OrganizationInvitation } from "../../../src/domain/identity/OrganizationInvitation.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import type { User } from "../../../src/domain/identity/User.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryInvitationRepository implements OrganizationInvitationRepository {
  public inviterMembership: OrganizationMember | null = null;
  public pendingInvitation = false;
  public createdInvitation: OrganizationInvitation | null = null;

  public findUserByEmail(emailAddress: EmailAddress): Promise<User | null> {
    void emailAddress;
    return Promise.resolve(null);
  }

  public findOrganizationMember(): Promise<OrganizationMember | null> {
    return Promise.resolve(this.inviterMembership);
  }

  public pendingInvitationExists(): Promise<boolean> {
    return Promise.resolve(this.pendingInvitation);
  }

  public createInvitation(invitation: OrganizationInvitation): Promise<void> {
    this.createdInvitation = invitation;
    return Promise.resolve();
  }

  public findPendingInvitationByTokenHash(): Promise<OrganizationInvitation | null> {
    return Promise.resolve(null);
  }

  public acceptInvitation(): Promise<User> {
    throw new Error("not used");
  }
}

describe("IssueOrganizationInvitationUseCase", () => {
  it("issues a 7-day invitation for owner/admin members", async () => {
    const repository = new InMemoryInvitationRepository();
    repository.inviterMembership = OrganizationMember.rehydrate({
      userId: "9bfdfdcf-e0c8-4097-a571-f207b383a6f0",
      role: "owner",
      joinedAt: new Date("2026-03-09T09:00:00.000Z")
    });
    const auditLog = new RecordingAuditLog();
    const useCase = new IssueOrganizationInvitationUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-09T12:00:00.000Z"),
      () => "unit-test-invite-token-0001"
    );

    const response = await useCase.execute({
      organizationId: "0c9169c2-e596-4cef-8f94-216e190ac8c6",
      inviterUserId: "9bfdfdcf-e0c8-4097-a571-f207b383a6f0",
      inviteeEmail: "invitee@example.com",
      role: "finance"
    });

    expect(response).toMatchObject({
      invitation: {
        organizationId: "0c9169c2-e596-4cef-8f94-216e190ac8c6",
        inviteeEmail: "invitee@example.com",
        role: "finance",
        invitedByUserId: "9bfdfdcf-e0c8-4097-a571-f207b383a6f0",
        expiresAt: "2026-03-16T12:00:00.000Z"
      },
      token: "unit-test-invite-token-0001"
    });
    expect(repository.createdInvitation?.organizationId.value).toBe(
      "0c9169c2-e596-4cef-8f94-216e190ac8c6"
    );
    expect(auditLog.events).toEqual([
      expect.objectContaining({
        eventName: "identity.organization.invitation.issued"
      })
    ]);
  });

  it("rejects invitations from members without invite authority", async () => {
    const repository = new InMemoryInvitationRepository();
    repository.inviterMembership = OrganizationMember.rehydrate({
      userId: "9bfdfdcf-e0c8-4097-a571-f207b383a6f0",
      role: "developer",
      joinedAt: new Date("2026-03-09T09:00:00.000Z")
    });
    const useCase = new IssueOrganizationInvitationUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "0c9169c2-e596-4cef-8f94-216e190ac8c6",
        inviterUserId: "9bfdfdcf-e0c8-4097-a571-f207b383a6f0",
        inviteeEmail: "invitee@example.com",
        role: "finance"
      })
    ).rejects.toBeInstanceOf(OrganizationInvitationAuthorizationError);
  });

  it("rejects duplicate pending invitations for the same org email", async () => {
    const repository = new InMemoryInvitationRepository();
    repository.inviterMembership = OrganizationMember.rehydrate({
      userId: "9bfdfdcf-e0c8-4097-a571-f207b383a6f0",
      role: "admin",
      joinedAt: new Date("2026-03-09T09:00:00.000Z")
    });
    repository.pendingInvitation = true;
    const useCase = new IssueOrganizationInvitationUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "0c9169c2-e596-4cef-8f94-216e190ac8c6",
        inviterUserId: "9bfdfdcf-e0c8-4097-a571-f207b383a6f0",
        inviteeEmail: "invitee@example.com",
        role: "finance"
      })
    ).rejects.toBeInstanceOf(PendingOrganizationInvitationConflictError);
  });
});
