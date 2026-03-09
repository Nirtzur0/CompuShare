import { describe, expect, it } from "vitest";
import {
  IssueOrganizationApiKeyUseCase,
  OrganizationApiKeyAuthorizationError,
  type IssueOrganizationApiKeyRequest
} from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { OrganizationApiKeyRepository } from "../../../src/application/identity/ports/OrganizationApiKeyRepository.js";
import type { OrganizationMembershipRepository } from "../../../src/application/identity/ports/OrganizationMembershipRepository.js";
import type { OrganizationApiKey } from "../../../src/domain/identity/OrganizationApiKey.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryIssueOrganizationApiKeyRepository
  implements
    Pick<OrganizationMembershipRepository, "findOrganizationMember">,
    OrganizationApiKeyRepository
{
  public actorMembership: OrganizationMember | null = null;
  public createdApiKey: OrganizationApiKey | null = null;

  public findOrganizationMember(): Promise<OrganizationMember | null> {
    return Promise.resolve(this.actorMembership);
  }

  public createOrganizationApiKey(apiKey: OrganizationApiKey): Promise<void> {
    this.createdApiKey = apiKey;
    return Promise.resolve();
  }

  public findOrganizationApiKeyBySecretHash(): Promise<OrganizationApiKey | null> {
    return Promise.resolve(null);
  }

  public recordOrganizationApiKeyUsage(): Promise<void> {
    return Promise.resolve();
  }
}

describe("IssueOrganizationApiKeyUseCase", () => {
  const request: IssueOrganizationApiKeyRequest = {
    organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
    actorUserId: "e501cc40-c479-4046-9ab5-5c7118796534",
    label: "CI deploy key",
    environment: "staging"
  };

  it("issues a hashed organization API key for owner/admin members", async () => {
    const repository = new InMemoryIssueOrganizationApiKeyRepository();
    repository.actorMembership = OrganizationMember.rehydrate({
      userId: request.actorUserId,
      role: "owner",
      joinedAt: new Date("2026-03-08T12:00:00.000Z")
    });
    const auditLog = new RecordingAuditLog();
    const useCase = new IssueOrganizationApiKeyUseCase(
      repository,
      repository,
      auditLog,
      () => new Date("2026-03-09T12:00:00.000Z"),
      () => "csk_example_secret_value_000000"
    );

    const response = await useCase.execute(request);

    expect(response.apiKey.id).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu);
    expect(response).toMatchObject({
      apiKey: {
        organizationId: request.organizationId,
        label: "CI deploy key",
        environment: "staging",
        secretPrefix: "csk_example_",
        issuedByUserId: request.actorUserId,
        createdAt: "2026-03-09T12:00:00.000Z"
      },
      secret: "csk_example_secret_value_000000"
    });
    expect(repository.createdApiKey?.secretHash).not.toBe(
      "csk_example_secret_value_000000"
    );
    expect(repository.createdApiKey?.environment).toBe("staging");
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]).toMatchObject({
      eventName: "identity.organization.api_key.issued",
      actorUserId: request.actorUserId,
      organizationId: request.organizationId,
      metadata: {
        environment: "staging",
        label: "CI deploy key",
        secretPrefix: "csk_example_"
      }
    });
  });

  it("rejects issuers that are not owner/admin members", async () => {
    const repository = new InMemoryIssueOrganizationApiKeyRepository();
    repository.actorMembership = OrganizationMember.rehydrate({
      userId: request.actorUserId,
      role: "developer",
      joinedAt: new Date("2026-03-08T12:00:00.000Z")
    });
    const useCase = new IssueOrganizationApiKeyUseCase(
      repository,
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      OrganizationApiKeyAuthorizationError
    );
    expect(repository.createdApiKey).toBeNull();
  });
});
