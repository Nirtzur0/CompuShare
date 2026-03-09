import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { ProviderNodeRoutingProfile } from "../../../domain/provider/ProviderNodeRoutingProfile.js";
import type { ProviderNodeId } from "../../../domain/provider/ProviderNodeId.js";

export interface ProviderRoutingProfileRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  providerNodeExists(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<boolean>;
  upsertProviderNodeRoutingProfile(
    routingProfile: ProviderNodeRoutingProfile
  ): Promise<void>;
}
