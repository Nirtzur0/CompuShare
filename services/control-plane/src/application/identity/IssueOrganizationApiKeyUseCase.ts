import { randomBytes } from "node:crypto";
import { OrganizationApiKey } from "../../domain/identity/OrganizationApiKey.js";
import { parseOrganizationApiKeyEnvironment } from "../../domain/identity/OrganizationApiKeyEnvironment.js";
import { OrganizationApiKeySecret } from "../../domain/identity/OrganizationApiKeySecret.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canManageOrganizationMembers } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import type { AuditLog } from "./ports/AuditLog.js";
import type { OrganizationApiKeyRepository } from "./ports/OrganizationApiKeyRepository.js";
import type { OrganizationMembershipRepository } from "./ports/OrganizationMembershipRepository.js";

export interface IssueOrganizationApiKeyRequest {
  organizationId: string;
  actorUserId: string;
  label: string;
  environment: string;
}

export interface IssueOrganizationApiKeyResponse {
  apiKey: {
    id: string;
    organizationId: string;
    label: string;
    environment: string;
    secretPrefix: string;
    issuedByUserId: string;
    createdAt: string;
  };
  secret: string;
}

export class OrganizationApiKeyAuthorizationError extends Error {
  public constructor() {
    super("Only owner or admin members may issue organization API keys.");
    this.name = "OrganizationApiKeyAuthorizationError";
  }
}

export class IssueOrganizationApiKeyUseCase {
  public constructor(
    private readonly membershipRepository: Pick<
      OrganizationMembershipRepository,
      "findOrganizationMember"
    >,
    private readonly apiKeyRepository: OrganizationApiKeyRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
    private readonly secretGenerator: () => string = () =>
      `csk_${randomBytes(24).toString("base64url")}`
  ) {}

  public async execute(
    request: IssueOrganizationApiKeyRequest
  ): Promise<IssueOrganizationApiKeyResponse> {
    const issuedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const environment = parseOrganizationApiKeyEnvironment(request.environment);

    const actorMembership =
      await this.membershipRepository.findOrganizationMember(
        organizationId,
        actorUserId
      );

    if (
      actorMembership === null ||
      !canManageOrganizationMembers(actorMembership.role)
    ) {
      throw new OrganizationApiKeyAuthorizationError();
    }

    const secret = OrganizationApiKeySecret.create(this.secretGenerator());
    const apiKey = OrganizationApiKey.issue({
      organizationId: organizationId.value,
      label: request.label,
      environment,
      secretHash: secret.toHash(),
      secretPrefix: secret.toPrefix(),
      issuedByUserId: actorUserId.value,
      createdAt: issuedAt
    });

    await this.apiKeyRepository.createOrganizationApiKey(apiKey);
    await this.auditLog.record({
      eventName: "identity.organization.api_key.issued",
      occurredAt: issuedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        apiKeyId: apiKey.id.value,
        environment,
        label: apiKey.label.value,
        secretPrefix: apiKey.secretPrefix
      }
    });

    return {
      apiKey: {
        id: apiKey.id.value,
        organizationId: apiKey.organizationId.value,
        label: apiKey.label.value,
        environment: apiKey.environment,
        secretPrefix: apiKey.secretPrefix,
        issuedByUserId: apiKey.issuedByUserId.value,
        createdAt: apiKey.createdAt.toISOString()
      },
      secret: secret.value
    };
  }
}
