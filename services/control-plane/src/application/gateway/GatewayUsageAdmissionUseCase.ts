import type { GatewayTrafficPolicy } from "../../config/GatewayTrafficPolicy.js";
import type { GatewayEmbeddingRequest } from "./ports/GatewayUpstreamClient.js";
import type {
  GatewayUsageAdmissionRepository,
  GatewayUsageQuotaSnapshot
} from "./ports/GatewayUsageAdmissionRepository.js";
import type { GatewayChatCompletionRequest } from "./ports/GatewayUpstreamClient.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { GatewayUsageAdmissionRequestSource } from "../../domain/gateway/GatewayUsageAdmission.js";
import type { AuthenticatedGatewayExecutionContext } from "./ExecuteChatCompletionUseCase.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { parseOrganizationApiKeyEnvironment } from "../../domain/identity/OrganizationApiKeyEnvironment.js";

interface GatewayAdmissionMetadata {
  limit: number;
  used: number;
  remaining: number;
  windowStartedAt: string;
  windowResetsAt: string;
}

export interface GatewayReservedUsageAdmission {
  admissionId: string;
  fixedDayQuota: GatewayAdmissionMetadata;
  requestRate: GatewayAdmissionMetadata | null;
}

export class GatewayRequestRateLimitExceededError extends Error {
  public constructor(public readonly metadata: GatewayAdmissionMetadata) {
    super("Gateway request rate limit exceeded.");
    this.name = "GatewayRequestRateLimitExceededError";
  }
}

export class GatewayTokenQuotaExceededError extends Error {
  public constructor(public readonly metadata: GatewayAdmissionMetadata) {
    super("Gateway fixed-day token quota exceeded.");
    this.name = "GatewayTokenQuotaExceededError";
  }
}

export class GatewayUsageAdmissionUseCase {
  public constructor(
    private readonly repository: GatewayUsageAdmissionRepository,
    private readonly auditLog: AuditLog,
    private readonly policy: GatewayTrafficPolicy,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async admitChatCompletion(input: {
    context: AuthenticatedGatewayExecutionContext;
    request: GatewayChatCompletionRequest;
    requestSource?: GatewayUsageAdmissionRequestSource;
  }): Promise<GatewayReservedUsageAdmission> {
    return this.reserveAdmission({
      context: input.context,
      requestKind: "chat.completions",
      requestSource: input.requestSource ?? "interactive",
      estimatedTotalTokens: this.estimateChatTokens(input.request)
    });
  }

  public async admitEmbedding(input: {
    context: AuthenticatedGatewayExecutionContext;
    request: GatewayEmbeddingRequest;
    requestSource?: GatewayUsageAdmissionRequestSource;
  }): Promise<GatewayReservedUsageAdmission> {
    return this.reserveAdmission({
      context: input.context,
      requestKind: "embeddings",
      requestSource: input.requestSource ?? "interactive",
      estimatedTotalTokens: this.estimateEmbeddingTokens(input.request)
    });
  }

  public async settle(input: {
    admissionId: string;
    actualTotalTokens: number;
    settledAt?: Date;
  }): Promise<void> {
    await this.repository.settleGatewayUsageAdmission(
      input.admissionId,
      input.actualTotalTokens,
      input.settledAt ?? this.clock()
    );
  }

  public async release(input: {
    admissionId: string;
    releaseReason: string;
    releasedAt?: Date;
  }): Promise<void> {
    await this.repository.releaseGatewayUsageAdmission(
      input.admissionId,
      input.releasedAt ?? this.clock(),
      input.releaseReason
    );
  }

  public async getQuotaSnapshot(input: {
    organizationId: string;
    environment: "development" | "staging" | "production";
    asOf?: Date;
  }): Promise<GatewayUsageQuotaSnapshot> {
    return this.repository.getGatewayUsageQuotaSnapshot({
      organizationId: OrganizationId.create(input.organizationId),
      environment: parseOrganizationApiKeyEnvironment(input.environment),
      asOf: input.asOf ?? this.clock(),
      fixedDayTokenLimit: this.policy.fixedDayTokenQuotaPerOrganizationEnvironment,
      syncRequestsPerMinutePerApiKey: this.policy.syncRequestsPerMinutePerApiKey,
      maxBatchItemsPerJob: this.policy.maxBatchItemsPerJob,
      maxActiveBatchesPerOrganizationEnvironment:
        this.policy.maxActiveBatchesPerOrganizationEnvironment
    });
  }

  private async reserveAdmission(input: {
    context: AuthenticatedGatewayExecutionContext;
    requestKind: "chat.completions" | "embeddings";
    requestSource: GatewayUsageAdmissionRequestSource;
    estimatedTotalTokens: number;
  }): Promise<GatewayReservedUsageAdmission> {
    const occurredAt = this.clock();
    const decision = await this.repository.reserveGatewayUsageAdmission({
      organizationId: OrganizationId.create(input.context.organizationId),
      environment: parseOrganizationApiKeyEnvironment(input.context.environment),
      apiKeyScopeId: input.context.apiKeyId,
      requestKind: input.requestKind,
      requestSource: input.requestSource,
      estimatedTotalTokens: input.estimatedTotalTokens,
      occurredAt,
      syncRequestsPerMinutePerApiKey: this.policy.syncRequestsPerMinutePerApiKey,
      fixedDayTokenQuota:
        this.policy.fixedDayTokenQuotaPerOrganizationEnvironment
    });

    if (!decision.admitted) {
      await this.auditLog.record({
        eventName:
          decision.reason === "request_rate_limit"
            ? "gateway.request_rate_limit.rejected"
            : "gateway.token_quota.rejected",
        occurredAt: occurredAt.toISOString(),
        actorUserId: input.context.issuedByUserId,
        organizationId: input.context.organizationId,
        metadata: {
          apiKeyId: input.context.apiKeyId,
          environment: input.context.environment,
          requestKind: input.requestKind,
          requestSource: input.requestSource,
          estimatedTotalTokens: input.estimatedTotalTokens,
          ...this.buildAuditMetadata("requestRate", decision.requestRate),
          ...this.buildAuditMetadata("fixedDayQuota", decision.fixedDayQuota)
        }
      });

      if (
        decision.reason === "request_rate_limit" &&
        decision.requestRate !== null
      ) {
        throw new GatewayRequestRateLimitExceededError(decision.requestRate);
      }

      throw new GatewayTokenQuotaExceededError(decision.fixedDayQuota);
    }

    if (decision.admission === null) {
      throw new Error("Expected an admitted gateway usage reservation.");
    }

    return {
      admissionId: decision.admission.id,
      fixedDayQuota: decision.fixedDayQuota,
      requestRate: decision.requestRate
    };
  }

  private estimateChatTokens(request: GatewayChatCompletionRequest): number {
    const promptBytes = request.messages.reduce(
      (total, message) =>
        total +
        Buffer.byteLength(message.role, "utf8") +
        Buffer.byteLength(message.content, "utf8"),
      0
    );

    return (
      promptBytes +
      (request.max_tokens ?? this.policy.defaultChatMaxTokensReservation)
    );
  }

  private estimateEmbeddingTokens(request: GatewayEmbeddingRequest): number {
    if (typeof request.input === "string") {
      return Buffer.byteLength(request.input, "utf8");
    }

    return request.input.reduce(
      (total, value) => total + Buffer.byteLength(value, "utf8"),
      0
    );
  }

  private buildAuditMetadata(
    prefix: "requestRate" | "fixedDayQuota",
    metadata: GatewayAdmissionMetadata | null
  ): Record<string, string | number | null> {
    if (metadata === null) {
      return {
        [`${prefix}Limit`]: null,
        [`${prefix}Used`]: null,
        [`${prefix}Remaining`]: null,
        [`${prefix}WindowStartedAt`]: null,
        [`${prefix}WindowResetsAt`]: null
      };
    }

    return {
      [`${prefix}Limit`]: metadata.limit,
      [`${prefix}Used`]: metadata.used,
      [`${prefix}Remaining`]: metadata.remaining,
      [`${prefix}WindowStartedAt`]: metadata.windowStartedAt,
      [`${prefix}WindowResetsAt`]: metadata.windowResetsAt
    };
  }
}
