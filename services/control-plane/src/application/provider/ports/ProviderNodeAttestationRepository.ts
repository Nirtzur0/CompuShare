import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { ProviderNodeAttestationChallenge } from "../../../domain/provider/ProviderNodeAttestationChallenge.js";
import type { ProviderNodeAttestationRecord } from "../../../domain/provider/ProviderNodeAttestationRecord.js";
import type { ProviderNodeId } from "../../../domain/provider/ProviderNodeId.js";
import type { ProviderNode } from "../../../domain/provider/ProviderNode.js";

export interface ProviderNodeAttestationRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findProviderNodeByOrganization(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<ProviderNode | null>;
  createProviderNodeAttestationChallenge(
    challenge: ProviderNodeAttestationChallenge
  ): Promise<void>;
  findProviderNodeAttestationChallenge(
    providerNodeId: ProviderNodeId,
    challengeId: string
  ): Promise<ProviderNodeAttestationChallenge | null>;
  markProviderNodeAttestationChallengeUsed(
    providerNodeId: ProviderNodeId,
    challengeId: string,
    usedAt: Date
  ): Promise<boolean>;
  createProviderNodeAttestationRecord(
    record: ProviderNodeAttestationRecord
  ): Promise<void>;
}
