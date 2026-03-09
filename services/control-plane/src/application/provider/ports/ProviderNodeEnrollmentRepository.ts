import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { ProviderMachineId } from "../../../domain/provider/ProviderMachineId.js";
import type { ProviderNode } from "../../../domain/provider/ProviderNode.js";

export interface ProviderNodeEnrollmentRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  providerNodeMachineIdExists(
    organizationId: OrganizationId,
    machineId: ProviderMachineId
  ): Promise<boolean>;
  createProviderNode(providerNode: ProviderNode): Promise<void>;
}
