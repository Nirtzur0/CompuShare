import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { ProviderNodeId } from "../../../domain/provider/ProviderNodeId.js";
import type { ProviderWarmModelState } from "../../../domain/provider/ProviderWarmModelState.js";

export interface ProviderRoutingStateRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  providerNodeExists(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<boolean>;
  replaceProviderNodeWarmModelStates(
    providerNodeId: ProviderNodeId,
    warmModelStates: readonly ProviderWarmModelState[]
  ): Promise<void>;
}
