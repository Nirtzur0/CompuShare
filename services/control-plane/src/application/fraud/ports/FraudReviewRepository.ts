import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { FraudGraphCounterpartyExposure } from "../../../domain/fraud/FraudGraphCounterpartyExposure.js";

export interface FraudReviewRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  listFraudGraphCounterpartyExposures(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<readonly FraudGraphCounterpartyExposure[]>;
}
