import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { ProviderInventorySummary } from "../../../domain/provider/ProviderInventorySummary.js";

export interface PlacementCandidateRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  listPlacementProviderInventorySummaries(): Promise<
    readonly ProviderInventorySummary[]
  >;
}
