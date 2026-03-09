import type { OrganizationApiKey } from "../../../domain/identity/OrganizationApiKey.js";
import type { OrganizationApiKeyId } from "../../../domain/identity/OrganizationApiKeyId.js";

export interface OrganizationApiKeyRepository {
  createOrganizationApiKey(apiKey: OrganizationApiKey): Promise<void>;
  findOrganizationApiKeyBySecretHash(
    secretHash: string
  ): Promise<OrganizationApiKey | null>;
  recordOrganizationApiKeyUsage(
    apiKeyId: OrganizationApiKeyId,
    usedAt: Date
  ): Promise<void>;
}
