import { OrganizationApiKeySecret } from "../../domain/identity/OrganizationApiKeySecret.js";
import type { OrganizationApiKeyEnvironment } from "../../domain/identity/OrganizationApiKeyEnvironment.js";
import type { AuditLog } from "./ports/AuditLog.js";
import type { OrganizationApiKeyRepository } from "./ports/OrganizationApiKeyRepository.js";

export interface AuthenticateGatewayApiKeyRequest {
  secret: string;
}

export interface AuthenticateGatewayApiKeyResponse {
  authorized: true;
  scope: {
    organizationId: string;
    environment: OrganizationApiKeyEnvironment;
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

export class GatewayApiKeyAuthenticationError extends Error {
  public constructor() {
    super("The provided gateway API key is invalid.");
    this.name = "GatewayApiKeyAuthenticationError";
  }
}

export class AuthenticateGatewayApiKeyUseCase {
  public constructor(
    private readonly apiKeyRepository: OrganizationApiKeyRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: AuthenticateGatewayApiKeyRequest
  ): Promise<AuthenticateGatewayApiKeyResponse> {
    const occurredAt = this.clock();
    const secret = OrganizationApiKeySecret.create(request.secret);
    const apiKey =
      await this.apiKeyRepository.findOrganizationApiKeyBySecretHash(
        secret.toHash()
      );

    if (apiKey === null) {
      throw new GatewayApiKeyAuthenticationError();
    }

    await this.apiKeyRepository.recordOrganizationApiKeyUsage(
      apiKey.id,
      occurredAt
    );
    await this.auditLog.record({
      eventName: "identity.gateway.api_key.authenticated",
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
