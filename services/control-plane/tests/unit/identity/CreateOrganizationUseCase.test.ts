import { describe, expect, it, vi } from "vitest";
import {
  CreateOrganizationUseCase,
  type CreateOrganizationRequest,
  OrganizationSlugConflictError
} from "../../../src/application/identity/CreateOrganizationUseCase.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { OrganizationProvisioningRepository } from "../../../src/application/identity/ports/OrganizationProvisioningRepository.js";
import type { EmailAddress } from "../../../src/domain/identity/EmailAddress.js";
import type { Organization } from "../../../src/domain/identity/Organization.js";
import type { OrganizationSlug } from "../../../src/domain/identity/OrganizationSlug.js";
import { User } from "../../../src/domain/identity/User.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryProvisioningRepository implements OrganizationProvisioningRepository {
  public slugExists = false;
  public persistedFounder: User | null = null;
  public lookedUpEmail: string | null = null;
  public savedOrganization: Organization | null = null;

  public findUserByEmail(email: EmailAddress): Promise<User | null> {
    this.lookedUpEmail = email.value;
    return Promise.resolve(this.persistedFounder);
  }

  public organizationSlugExists(slug: OrganizationSlug): Promise<boolean> {
    void slug;
    return Promise.resolve(this.slugExists);
  }

  public createOrganization(
    organization: Organization,
    founder: User
  ): Promise<User> {
    this.savedOrganization = organization;
    this.persistedFounder = founder;
    return Promise.resolve(founder);
  }
}

describe("CreateOrganizationUseCase", () => {
  const request: CreateOrganizationRequest = {
    organizationName: "Acme AI",
    organizationSlug: "acme-ai",
    founderEmail: "founder@example.com",
    founderDisplayName: "Founding Owner",
    accountCapabilities: ["buyer", "provider"]
  };

  it("creates an organization and records an audit event", async () => {
    const repository = new InMemoryProvisioningRepository();
    const auditLog = new RecordingAuditLog();
    const useCase = new CreateOrganizationUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-09T12:00:00.000Z")
    );

    const response = await useCase.execute(request);

    expect(response.organization).toMatchObject({
      name: "Acme AI",
      slug: "acme-ai",
      accountCapabilities: ["buyer", "provider"]
    });
    expect(response.founder).toMatchObject({
      email: "founder@example.com",
      role: "owner"
    });
    expect(repository.savedOrganization?.toSnapshot().members).toEqual([
      {
        userId: response.founder.userId,
        role: "owner",
        joinedAt: "2026-03-09T12:00:00.000Z"
      }
    ]);
    expect(auditLog.events).toEqual([
      expect.objectContaining({
        eventName: "identity.organization.created",
        actorUserId: response.founder.userId,
        organizationId: response.organization.id
      })
    ]);
  });

  it("reuses an existing founder account when the email already exists", async () => {
    const repository = new InMemoryProvisioningRepository();
    repository.persistedFounder = User.rehydrate({
      id: "43cb6651-1f2e-4504-9559-d14cf5814db9",
      email: "founder@example.com",
      displayName: "Existing Founder",
      createdAt: new Date("2026-03-08T00:00:00.000Z")
    });
    const useCase = new CreateOrganizationUseCase(
      repository,
      new RecordingAuditLog(),
      () => new Date("2026-03-09T12:00:00.000Z")
    );

    const response = await useCase.execute(request);

    expect(response.founder).toMatchObject({
      userId: "43cb6651-1f2e-4504-9559-d14cf5814db9",
      displayName: "Existing Founder"
    });
    expect(repository.lookedUpEmail).toBe("founder@example.com");
  });

  it("rejects duplicate organization slugs before writing data", async () => {
    const repository = new InMemoryProvisioningRepository();
    repository.slugExists = true;
    const createOrganization = vi.fn(
      repository.createOrganization.bind(repository)
    );
    repository.createOrganization = createOrganization;
    const useCase = new CreateOrganizationUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      OrganizationSlugConflictError
    );
    expect(createOrganization).not.toHaveBeenCalled();
  });
});
