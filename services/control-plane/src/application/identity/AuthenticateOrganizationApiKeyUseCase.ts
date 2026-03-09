import { OrganizationApiKeySecret } from "../../domain/identity/OrganizationApiKeySecret.js";
import { parseOrganizationApiKeyEnvironment } from "../../domain/identity/OrganizationApiKeyEnvironment.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { AuditLog } from "./ports/AuditLog.js";
import type { OrganizationApiKeyRepository } from "./ports/OrganizationApiKeyRepository.js";

export interface AuthenticateOrganizationApiKeyRequest {
  organizationId: string;
  environment: string;
  secret: string;
}

export interface AuthenticateOrganizationApiKeyResponse {
  authorized: true;
  scope: {
    organizationId: string;
    environment: string;
  };
  apiKey: {
    id: string;
    label: string;
    secretPrefix: string;
    issuedByUserId: string;
    createdAt: string;
    lastUsedAt: string;
  };
}

export class OrganizationApiKeyAuthenticationError extends Error {
  public constructor() {
    super("The provided organization API key is invalid.");
    this.name = "OrganizationApiKeyAuthenticationError";
  }
}

export class OrganizationApiKeyScopeMismatchError extends Error {
  public constructor() {
    super(
      "The provided organization API key does not match the requested scope."
    );
    this.name = "OrganizationApiKeyScopeMismatchError";
  }
}

export class AuthenticateOrganizationApiKeyUseCase {
  public constructor(
    private readonly apiKeyRepository: OrganizationApiKeyRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: AuthenticateOrganizationApiKeyRequest
  ): Promise<AuthenticateOrganizationApiKeyResponse> {
    const occurredAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const environment = parseOrganizationApiKeyEnvironment(request.environment);
    const secret = OrganizationApiKeySecret.create(request.secret);
    const apiKey =
      await this.apiKeyRepository.findOrganizationApiKeyBySecretHash(
        secret.toHash()
      );

    if (apiKey === null) {
      throw new OrganizationApiKeyAuthenticationError();
    }

    if (
      apiKey.organizationId.value !== organizationId.value ||
      apiKey.environment !== environment
    ) {
      throw new OrganizationApiKeyScopeMismatchError();
    }

    await this.apiKeyRepository.recordOrganizationApiKeyUsage(
      apiKey.id,
      occurredAt
    );
    await this.auditLog.record({
      eventName: "identity.organization.api_key.authenticated",
      occurredAt: occurredAt.toISOString(),
      actorUserId: apiKey.issuedByUserId.value,
      organizationId: apiKey.organizationId.value,
      metadata: {
        apiKeyId: apiKey.id.value,
        environment: apiKey.environment,
        secretPrefix: apiKey.secretPrefix
      }
    });

    return {
      authorized: true,
      scope: {
        organizationId: apiKey.organizationId.value,
        environment: apiKey.environment
      },
      apiKey: {
        id: apiKey.id.value,
        label: apiKey.label.value,
        secretPrefix: apiKey.secretPrefix,
        issuedByUserId: apiKey.issuedByUserId.value,
        createdAt: apiKey.createdAt.toISOString(),
        lastUsedAt: occurredAt.toISOString()
      }
    };
  }
}
