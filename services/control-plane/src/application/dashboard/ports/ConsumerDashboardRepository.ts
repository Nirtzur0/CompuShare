import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { OrganizationWalletSummary } from "../../../domain/ledger/OrganizationWalletSummary.js";
import type { OrganizationApiKeyEnvironment } from "../../../domain/identity/OrganizationApiKeyEnvironment.js";
import type { ConsumerSpendSummary } from "../../../domain/dashboard/ConsumerSpendSummary.js";
import type { GatewayUsageQuotaSnapshot } from "../../gateway/ports/GatewayUsageAdmissionRepository.js";

export interface ConsumerDashboardRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  getOrganizationWalletSummary(
    organizationId: OrganizationId
  ): Promise<OrganizationWalletSummary>;
  getConsumerSpendSummary(
    organizationId: OrganizationId
  ): Promise<ConsumerSpendSummary>;
  listConsumerDailyUsageTrend(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      date: string;
      requestCount: number;
      totalTokens: number;
    }[]
  >;
  listConsumerLatencyByModel(input: {
    organizationId: OrganizationId;
    startDateInclusive: Date;
    endDateExclusive: Date;
  }): Promise<
    readonly {
      modelAlias: string;
      requestCount: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      totalTokens: number;
    }[]
  >;
  getGatewayUsageQuotaSnapshot(input: {
    organizationId: OrganizationId;
    environment: OrganizationApiKeyEnvironment;
    asOf: Date;
    fixedDayTokenLimit: number;
    syncRequestsPerMinutePerApiKey: number;
    maxBatchItemsPerJob: number;
    maxActiveBatchesPerOrganizationEnvironment: number;
  }): Promise<GatewayUsageQuotaSnapshot>;
}
