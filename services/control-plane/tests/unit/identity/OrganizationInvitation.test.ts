import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { OrganizationInvitation } from "../../../src/domain/identity/OrganizationInvitation.js";

describe("OrganizationInvitation", () => {
  it("tracks expiry for pending invitations", () => {
    const invitation = OrganizationInvitation.issue({
      organizationId: "fe7f1a49-5526-4d6d-9ac8-153d2008cb3c",
      inviteeEmail: "invitee@example.com",
      role: "developer",
      invitedByUserId: "0c73da66-0f72-4cc1-90d8-595f469cdb67",
      tokenHash:
        "9f7ecda14f71ad285eb90dd8cc3f1b978ee88691f78fb88f7fa8a308941d2224",
      createdAt: new Date("2026-03-09T00:00:00.000Z"),
      expiresAt: new Date("2026-03-16T00:00:00.000Z")
    });

    expect(invitation.isExpired(new Date("2026-03-15T23:59:59.000Z"))).toBe(
      false
    );
    expect(invitation.isExpired(new Date("2026-03-16T00:00:00.000Z"))).toBe(
      true
    );
  });

  it("rejects invalid token hashes", () => {
    expect(() =>
      OrganizationInvitation.issue({
        organizationId: "fe7f1a49-5526-4d6d-9ac8-153d2008cb3c",
        inviteeEmail: "invitee@example.com",
        role: "developer",
        invitedByUserId: "0c73da66-0f72-4cc1-90d8-595f469cdb67",
        tokenHash: "bad-hash",
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        expiresAt: new Date("2026-03-16T00:00:00.000Z")
      })
    ).toThrow(DomainValidationError);
  });
});
