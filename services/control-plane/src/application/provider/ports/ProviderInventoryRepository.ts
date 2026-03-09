import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { ProviderInventorySummary } from "../../../domain/provider/ProviderInventorySummary.js";
import type { ProviderNodeId } from "../../../domain/provider/ProviderNodeId.js";

export interface ProviderInventoryRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findProviderInventorySummary(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<ProviderInventorySummary | null>;
  listProviderInventorySummaries(
    organizationId: OrganizationId
  ): Promise<readonly ProviderInventorySummary[]>;
}
