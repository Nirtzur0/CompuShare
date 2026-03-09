import type { OrganizationApiKeyEnvironment } from "./OrganizationApiKeyEnvironment.js";
import { OrganizationApiKeyId } from "./OrganizationApiKeyId.js";
import { OrganizationApiKeyLabel } from "./OrganizationApiKeyLabel.js";
import { OrganizationId } from "./OrganizationId.js";
import { UserId } from "./UserId.js";

export interface IssueOrganizationApiKeyInput {
  organizationId: string;
  label: string;
  environment: OrganizationApiKeyEnvironment;
  secretHash: string;
  secretPrefix: string;
  issuedByUserId: string;
  createdAt?: Date;
}

export interface RehydrateOrganizationApiKeyInput {
  id: string;
  organizationId: string;
  label: string;
  environment: OrganizationApiKeyEnvironment;
  secretHash: string;
  secretPrefix: string;
  issuedByUserId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export class OrganizationApiKey {
  private constructor(
    public readonly id: OrganizationApiKeyId,
    public readonly organizationId: OrganizationId,
    public readonly label: OrganizationApiKeyLabel,
    public readonly environment: OrganizationApiKeyEnvironment,
    public readonly secretHash: string,
    public readonly secretPrefix: string,
    public readonly issuedByUserId: UserId,
    public readonly createdAt: Date,
    public readonly lastUsedAt: Date | null
  ) {}

  public static issue(input: IssueOrganizationApiKeyInput): OrganizationApiKey {
    return new OrganizationApiKey(
      OrganizationApiKeyId.create(),
      OrganizationId.create(input.organizationId),
      OrganizationApiKeyLabel.create(input.label),
      input.environment,
      input.secretHash,
      input.secretPrefix,
      UserId.create(input.issuedByUserId),
      input.createdAt ?? new Date(),
      null
    );
  }

  public static rehydrate(
    input: RehydrateOrganizationApiKeyInput
  ): OrganizationApiKey {
    return new OrganizationApiKey(
      OrganizationApiKeyId.create(input.id),
      OrganizationId.create(input.organizationId),
      OrganizationApiKeyLabel.create(input.label),
      input.environment,
      input.secretHash,
      input.secretPrefix,
      UserId.create(input.issuedByUserId),
      input.createdAt,
      input.lastUsedAt
    );
  }

  public registerUsage(lastUsedAt: Date): OrganizationApiKey {
    return new OrganizationApiKey(
      this.id,
      this.organizationId,
      this.label,
      this.environment,
      this.secretHash,
      this.secretPrefix,
      this.issuedByUserId,
      this.createdAt,
      lastUsedAt
    );
  }
}
