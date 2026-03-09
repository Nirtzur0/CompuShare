import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { OrganizationWalletSummary } from "../../../domain/ledger/OrganizationWalletSummary.js";
import type { ProviderInventorySummary } from "../../../domain/provider/ProviderInventorySummary.js";
import type { UsdAmount } from "../../../domain/ledger/UsdAmount.js";

export interface ProviderDashboardRepository {
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
  getOrganizationWalletSummary(
    organizationId: OrganizationId
  ): Promise<OrganizationWalletSummary>;
  listProviderDailyEarningsTrend(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      date: string;
      earnings: UsdAmount;
      reserveHoldback: UsdAmount;
    }[]
  >;
  listProviderDailyTokenUsageTrend(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      date: string;
      totalTokens: number;
    }[]
  >;
}
