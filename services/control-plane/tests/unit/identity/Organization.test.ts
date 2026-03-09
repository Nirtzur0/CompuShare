import { describe, expect, it } from "vitest";
import { Organization } from "../../../src/domain/identity/Organization.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { OrganizationSlug } from "../../../src/domain/identity/OrganizationSlug.js";
import { User } from "../../../src/domain/identity/User.js";
import { EmailAddress } from "../../../src/domain/identity/EmailAddress.js";

describe("Organization", () => {
  it("creates an organization with deduplicated buyer/provider capabilities", () => {
    const founder = User.createNew({
      email: EmailAddress.create("founder@example.com"),
      displayName: "Founding Owner",
      createdAt: new Date("2026-03-09T10:00:00.000Z")
    });

    const organization = Organization.createNew({
      name: "Acme AI",
      slug: OrganizationSlug.create("acme-ai"),
      accountCapabilities: ["provider", "buyer", "provider"],
      founder,
      createdAt: new Date("2026-03-09T10:00:00.000Z")
    });

    expect(organization.toSnapshot()).toMatchObject({
      name: "Acme AI",
      slug: "acme-ai",
      accountCapabilities: ["buyer", "provider"],
      members: [{ userId: founder.id.value, role: "owner" }]
    });
  });

  it("rejects rehydrated organizations without an owner", () => {
    expect(() =>
      Organization.rehydrate({
        id: "0cf334f0-cfb2-4d95-84c8-94942a06264f",
        name: "Acme AI",
        slug: "acme-ai",
        accountCapabilities: ["buyer"],
        members: [
          OrganizationMember.rehydrate({
            userId: "c5d18b70-390b-4bf1-bd7f-6b0f87fe3e9f",
            role: "developer",
            joinedAt: new Date("2026-03-09T10:00:00.000Z")
          })
        ],
        createdAt: new Date("2026-03-09T10:00:00.000Z")
      })
    ).toThrow(DomainValidationError);
  });
});
