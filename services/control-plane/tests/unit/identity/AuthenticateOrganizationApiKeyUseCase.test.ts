import { describe, expect, it } from "vitest";
import {
  AuthenticateOrganizationApiKeyUseCase,
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError
} from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { OrganizationApiKeyRepository } from "../../../src/application/identity/ports/OrganizationApiKeyRepository.js";
import { OrganizationApiKey } from "../../../src/domain/identity/OrganizationApiKey.js";
import type { OrganizationApiKeyId } from "../../../src/domain/identity/OrganizationApiKeyId.js";
import { OrganizationApiKeySecret } from "../../../src/domain/identity/OrganizationApiKeySecret.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryAuthenticateOrganizationApiKeyRepository implements OrganizationApiKeyRepository {
  public apiKey: OrganizationApiKey | null = null;
  public lastUsedApiKeyId: OrganizationApiKeyId | null = null;
  public lastUsedAt: Date | null = null;

  public createOrganizationApiKey(): Promise<void> {
    return Promise.resolve();
  }

  public findOrganizationApiKeyBySecretHash(
    secretHash: string
  ): Promise<OrganizationApiKey | null> {
    if (this.apiKey?.secretHash === secretHash) {
      return Promise.resolve(this.apiKey);
    }

    return Promise.resolve(null);
  }

  public recordOrganizationApiKeyUsage(
    apiKeyId: OrganizationApiKeyId,
    usedAt: Date
  ): Promise<void> {
    this.lastUsedApiKeyId = apiKeyId;
    this.lastUsedAt = usedAt;
    return Promise.resolve();
  }
}

describe("AuthenticateOrganizationApiKeyUseCase", () => {
  const secret = OrganizationApiKeySecret.create(
    "csk_example_secret_value_000000"
  );

  it("authenticates a matching organization API key and records usage", async () => {
    const repository = new InMemoryAuthenticateOrganizationApiKeyRepository();
    repository.apiKey = OrganizationApiKey.issue({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      label: "CI deploy key",
      environment: "production",
      secretHash: secret.toHash(),
      secretPrefix: secret.toPrefix(),
      issuedByUserId: "e501cc40-c479-4046-9ab5-5c7118796534",
      createdAt: new Date("2026-03-08T12:00:00.000Z")
    });
    const auditLog = new RecordingAuditLog();
    const useCase = new AuthenticateOrganizationApiKeyUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-09T14:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      environment: "production",
      secret: secret.value
    });

    expect(response).toEqual({
      authorized: true,
      scope: {
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        environment: "production"
      },
      apiKey: {
        id: repository.apiKey.id.value,
        label: "CI deploy key",
        secretPrefix: "csk_example_",
        issuedByUserId: "e501cc40-c479-4046-9ab5-5c7118796534",
        createdAt: "2026-03-08T12:00:00.000Z",
        lastUsedAt: "2026-03-09T14:00:00.000Z"
      }
    });
    expect(repository.lastUsedApiKeyId?.value).toBe(repository.apiKey.id.value);
    expect(repository.lastUsedAt?.toISOString()).toBe(
      "2026-03-09T14:00:00.000Z"
    );
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]).toMatchObject({
      eventName: "identity.organization.api_key.authenticated",
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      metadata: {
        environment: "production",
        secretPrefix: "csk_example_"
      }
    });
  });

  it("rejects unknown organization API keys", async () => {
    const useCase = new AuthenticateOrganizationApiKeyUseCase(
      new InMemoryAuthenticateOrganizationApiKeyRepository(),
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        environment: "production",
        secret: secret.value
      })
    ).rejects.toBeInstanceOf(OrganizationApiKeyAuthenticationError);
  });

  it("rejects organization API keys presented against a different scope", async () => {
    const repository = new InMemoryAuthenticateOrganizationApiKeyRepository();
    repository.apiKey = OrganizationApiKey.issue({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      label: "CI deploy key",
      environment: "staging",
      secretHash: secret.toHash(),
      secretPrefix: secret.toPrefix(),
      issuedByUserId: "e501cc40-c479-4046-9ab5-5c7118796534",
      createdAt: new Date("2026-03-08T12:00:00.000Z")
    });
    const useCase = new AuthenticateOrganizationApiKeyUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        environment: "production",
        secret: secret.value
      })
    ).rejects.toBeInstanceOf(OrganizationApiKeyScopeMismatchError);
  });
});
