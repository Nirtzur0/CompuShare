import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { ProviderSubprocessor } from "../../../domain/compliance/ProviderSubprocessor.js";
import type { OrganizationApiKeyEnvironment } from "../../../domain/identity/OrganizationApiKeyEnvironment.js";

export interface ComplianceRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  listRoutableProviderSubprocessors(input: {
    environment: OrganizationApiKeyEnvironment;
    now: Date;
  }): Promise<readonly ProviderSubprocessor[]>;
}
