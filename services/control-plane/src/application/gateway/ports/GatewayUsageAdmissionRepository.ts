import type {
  GatewayUsageAdmission,
  GatewayUsageAdmissionRequestSource,
  GatewayUsageRequestKind
} from "../../../domain/gateway/GatewayUsageAdmission.js";
import type { OrganizationApiKeyEnvironment } from "../../../domain/identity/OrganizationApiKeyEnvironment.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";

export interface GatewayUsageQuotaSnapshot {
  environment: OrganizationApiKeyEnvironment;
  fixedDayStartedAt: string;
  fixedDayResetsAt: string;
  fixedDayTokenLimit: number;
  fixedDayUsedTokens: number;
  fixedDayRemainingTokens: number;
  syncRequestsPerMinutePerApiKey: number;
  maxBatchItemsPerJob: number;
  maxActiveBatchesPerOrganizationEnvironment: number;
}

export interface ReserveGatewayUsageAdmissionDecision {
  admitted: boolean;
  reason: "request_rate_limit" | "token_quota" | null;
  admission: GatewayUsageAdmission | null;
  requestRate: {
    limit: number;
    used: number;
    remaining: number;
    windowStartedAt: string;
    windowResetsAt: string;
  } | null;
  fixedDayQuota: {
    limit: number;
    used: number;
    remaining: number;
    windowStartedAt: string;
    windowResetsAt: string;
  };
}

export interface GatewayUsageAdmissionRepository {
  reserveGatewayUsageAdmission(input: {
    organizationId: OrganizationId;
    environment: OrganizationApiKeyEnvironment;
    apiKeyScopeId: string;
    requestKind: GatewayUsageRequestKind;
    requestSource: GatewayUsageAdmissionRequestSource;
    estimatedTotalTokens: number;
    occurredAt: Date;
    syncRequestsPerMinutePerApiKey: number;
    fixedDayTokenQuota: number;
  }): Promise<ReserveGatewayUsageAdmissionDecision>;
  settleGatewayUsageAdmission(
    admissionId: string,
    actualTotalTokens: number,
    settledAt: Date
  ): Promise<void>;
  releaseGatewayUsageAdmission(
    admissionId: string,
    releasedAt: Date,
    releaseReason: string
  ): Promise<void>;
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
