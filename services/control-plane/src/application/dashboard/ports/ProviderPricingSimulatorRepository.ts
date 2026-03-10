import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { ProviderInventorySummary } from "../../../domain/provider/ProviderInventorySummary.js";
import type { UsdAmount } from "../../../domain/ledger/UsdAmount.js";

export interface ProviderPricingSimulatorRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  listProviderInventorySummaries(
    organizationId: OrganizationId
  ): Promise<readonly ProviderInventorySummary[]>;
  listProviderNodeUsageTotals(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      providerNodeId: string;
      totalTokens: number;
    }[]
  >;
  getProviderSettlementEconomics(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<{
    settlementCount: number;
    providerPayable: UsdAmount;
    platformRevenue: UsdAmount;
    reserveHoldback: UsdAmount;
  }>;
}
