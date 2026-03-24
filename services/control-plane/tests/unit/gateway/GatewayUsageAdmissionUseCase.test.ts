import { describe, expect, it } from "vitest";
import {
  GatewayRequestRateLimitExceededError,
  GatewayTokenQuotaExceededError,
  GatewayUsageAdmissionUseCase
} from "../../../src/application/gateway/GatewayUsageAdmissionUseCase.js";
import type {
  GatewayUsageAdmissionRepository,
  GatewayUsageQuotaSnapshot,
  ReserveGatewayUsageAdmissionDecision
} from "../../../src/application/gateway/ports/GatewayUsageAdmissionRepository.js";
import type { AuditEvent, AuditLog } from "../../../src/application/identity/ports/AuditLog.js";
import { GatewayTrafficPolicy } from "../../../src/config/GatewayTrafficPolicy.js";
import { GatewayUsageAdmission } from "../../../src/domain/gateway/GatewayUsageAdmission.js";

const fixedClock = () => new Date("2026-03-20T12:00:00.000Z");

const authenticatedContext = {
  organizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
  environment: "production" as const,
  apiKeyId: "d3939649-841a-4f95-b2fa-b13d464f0d43",
  issuedByUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c"
};

function createDecision(
  overrides: Partial<ReserveGatewayUsageAdmissionDecision> = {}
): ReserveGatewayUsageAdmissionDecision {
  return {
    admitted: true,
    reason: null,
    admission: GatewayUsageAdmission.reserve({
      organizationId: authenticatedContext.organizationId,
      environment: authenticatedContext.environment,
      apiKeyScopeId: authenticatedContext.apiKeyId,
      requestKind: "chat.completions",
      requestSource: "interactive",
      estimatedTotalTokens: 120,
      createdAt: fixedClock()
    }),
    requestRate: {
      limit: 60,
      used: 2,
      remaining: 58,
      windowStartedAt: "2026-03-20T11:59:00.000Z",
      windowResetsAt: "2026-03-20T12:00:00.000Z"
    },
    fixedDayQuota: {
      limit: 2_000_000,
      used: 20_000,
      remaining: 1_980_000,
      windowStartedAt: "2026-03-20T00:00:00.000Z",
      windowResetsAt: "2026-03-21T00:00:00.000Z"
    },
    ...overrides
  };
}

function createHarness(
  options: {
    reserveDecision?: ReserveGatewayUsageAdmissionDecision;
    quotaSnapshot?: GatewayUsageQuotaSnapshot;
  } = {}
) {
  const reserveRequests: Parameters<
    GatewayUsageAdmissionRepository["reserveGatewayUsageAdmission"]
  >[0][] = [];
  const settleCalls: {
    admissionId: string;
    actualTotalTokens: number;
    settledAt: Date;
  }[] = [];
  const releaseCalls: {
    admissionId: string;
    releasedAt: Date;
    releaseReason: string;
  }[] = [];
  const quotaRequests: Parameters<
    GatewayUsageAdmissionRepository["getGatewayUsageQuotaSnapshot"]
  >[0][] = [];
  const auditEvents: AuditEvent[] = [];

  const repository: GatewayUsageAdmissionRepository = {
    reserveGatewayUsageAdmission: (input) => {
      reserveRequests.push(input);
      return Promise.resolve(options.reserveDecision ?? createDecision());
    },
    settleGatewayUsageAdmission: (admissionId, actualTotalTokens, settledAt) => {
      settleCalls.push({ admissionId, actualTotalTokens, settledAt });
      return Promise.resolve();
    },
    releaseGatewayUsageAdmission: (admissionId, releasedAt, releaseReason) => {
      releaseCalls.push({ admissionId, releasedAt, releaseReason });
      return Promise.resolve();
    },
    getGatewayUsageQuotaSnapshot: (input) => {
      quotaRequests.push(input);
      return Promise.resolve(
        options.quotaSnapshot ?? {
          environment: input.environment,
          fixedDayStartedAt: "2026-03-20T00:00:00.000Z",
          fixedDayResetsAt: "2026-03-21T00:00:00.000Z",
          fixedDayTokenLimit: input.fixedDayTokenLimit,
          fixedDayUsedTokens: 1024,
          fixedDayRemainingTokens: input.fixedDayTokenLimit - 1024,
          syncRequestsPerMinutePerApiKey: input.syncRequestsPerMinutePerApiKey,
          maxBatchItemsPerJob: input.maxBatchItemsPerJob,
          maxActiveBatchesPerOrganizationEnvironment:
            input.maxActiveBatchesPerOrganizationEnvironment
        }
      );
    }
  };

  const auditLog: AuditLog = {
    record: (event) => {
      auditEvents.push(event);
      return Promise.resolve();
    }
  };

  return {
    useCase: new GatewayUsageAdmissionUseCase(
      repository,
      auditLog,
      GatewayTrafficPolicy.createDefault(),
      fixedClock
    ),
    reserveRequests,
    settleCalls,
    releaseCalls,
    quotaRequests,
    auditEvents
  };
}

describe("GatewayUsageAdmissionUseCase", () => {
  it("reserves chat admissions with explicit max_tokens", async () => {
    const harness = createHarness();

    const response = await harness.useCase.admitChatCompletion({
      context: authenticatedContext,
      request: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "hello" }],
        max_tokens: 123
      }
    });

    expect(response.admissionId).toEqual(expect.any(String));
    expect(harness.reserveRequests).toHaveLength(1);
    expect(harness.reserveRequests[0]).toMatchObject({
      apiKeyScopeId: authenticatedContext.apiKeyId,
      requestKind: "chat.completions",
      requestSource: "interactive",
      estimatedTotalTokens:
        Buffer.byteLength("user", "utf8") +
        Buffer.byteLength("hello", "utf8") +
        123,
      syncRequestsPerMinutePerApiKey: 60,
      fixedDayTokenQuota: 2_000_000
    });
  });

  it("uses the default chat reservation when max_tokens is missing", async () => {
    const harness = createHarness();

    await harness.useCase.admitChatCompletion({
      context: authenticatedContext,
      request: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "system", content: "trim" }]
      }
    });

    expect(harness.reserveRequests[0]?.estimatedTotalTokens).toBe(
      Buffer.byteLength("system", "utf8") +
        Buffer.byteLength("trim", "utf8") +
        4_096
    );
  });

  it.each([
    {
      label: "string embedding input",
      request: { model: "cheap-embed-v1", input: "hello embeddings" },
      expectedTokens: Buffer.byteLength("hello embeddings", "utf8")
    },
    {
      label: "array embedding input",
      request: {
        model: "cheap-embed-v1",
        input: ["hello", "embeddings"] as const
      },
      expectedTokens:
        Buffer.byteLength("hello", "utf8") +
        Buffer.byteLength("embeddings", "utf8")
    }
  ])("reserves embeddings for $label", async ({ request, expectedTokens }) => {
    const harness = createHarness();

    await harness.useCase.admitEmbedding({
      context: authenticatedContext,
      request
    });

    expect(harness.reserveRequests[0]).toMatchObject({
      requestKind: "embeddings",
      requestSource: "interactive",
      estimatedTotalTokens: expectedTokens
    });
  });

  it("throws a request rate limit error with flattened audit metadata", async () => {
    const harness = createHarness({
      reserveDecision: createDecision({
        admitted: false,
        reason: "request_rate_limit",
        admission: null
      })
    });

    await expect(
      harness.useCase.admitChatCompletion({
        context: authenticatedContext,
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "hello" }]
        }
      })
    ).rejects.toBeInstanceOf(GatewayRequestRateLimitExceededError);

    expect(harness.auditEvents).toHaveLength(1);
    expect(harness.auditEvents[0]).toMatchObject({
      eventName: "gateway.request_rate_limit.rejected",
      actorUserId: authenticatedContext.issuedByUserId,
      organizationId: authenticatedContext.organizationId
    });
    expect(harness.auditEvents[0]?.metadata).toMatchObject({
      apiKeyId: authenticatedContext.apiKeyId,
      environment: authenticatedContext.environment,
      requestKind: "chat.completions",
      requestSource: "interactive",
      requestRateLimit: 60,
      requestRateUsed: 2,
      requestRateRemaining: 58,
      requestRateWindowStartedAt: "2026-03-20T11:59:00.000Z",
      requestRateWindowResetsAt: "2026-03-20T12:00:00.000Z",
      fixedDayQuotaLimit: 2_000_000,
      fixedDayQuotaUsed: 20_000,
      fixedDayQuotaRemaining: 1_980_000,
      fixedDayQuotaWindowStartedAt: "2026-03-20T00:00:00.000Z",
      fixedDayQuotaWindowResetsAt: "2026-03-21T00:00:00.000Z"
    });
  });

  it("throws a token quota error and records null request-rate metadata", async () => {
    const harness = createHarness({
      reserveDecision: createDecision({
        admitted: false,
        reason: "token_quota",
        admission: null,
        requestRate: null
      })
    });

    await expect(
      harness.useCase.admitEmbedding({
        context: authenticatedContext,
        request: {
          model: "cheap-embed-v1",
          input: "quota test"
        },
        requestSource: "batch_worker"
      })
    ).rejects.toBeInstanceOf(GatewayTokenQuotaExceededError);

    expect(harness.auditEvents[0]).toMatchObject({
      eventName: "gateway.token_quota.rejected"
    });
    expect(harness.auditEvents[0]?.metadata).toMatchObject({
      requestKind: "embeddings",
      requestSource: "batch_worker",
      requestRateLimit: null,
      requestRateUsed: null,
      requestRateRemaining: null,
      requestRateWindowStartedAt: null,
      requestRateWindowResetsAt: null
    });
  });

  it("fails loudly when the repository returns an admitted decision without an admission", async () => {
    const harness = createHarness({
      reserveDecision: createDecision({
        admission: null
      })
    });

    await expect(
      harness.useCase.admitChatCompletion({
        context: authenticatedContext,
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "hello" }]
        }
      })
    ).rejects.toThrow("Expected an admitted gateway usage reservation.");
  });

  it("delegates settle and release to the repository", async () => {
    const harness = createHarness();

    await harness.useCase.settle({
      admissionId: "8de9922f-7437-41d2-b6ca-c76d6d89df3b",
      actualTotalTokens: 321
    });
    await harness.useCase.release({
      admissionId: "8de9922f-7437-41d2-b6ca-c76d6d89df3b",
      releaseReason: "request_failed"
    });

    expect(harness.settleCalls).toEqual([
      {
        admissionId: "8de9922f-7437-41d2-b6ca-c76d6d89df3b",
        actualTotalTokens: 321,
        settledAt: fixedClock()
      }
    ]);
    expect(harness.releaseCalls).toEqual([
      {
        admissionId: "8de9922f-7437-41d2-b6ca-c76d6d89df3b",
        releasedAt: fixedClock(),
        releaseReason: "request_failed"
      }
    ]);
  });

  it("returns quota snapshots with parsed environment and policy limits", async () => {
    const harness = createHarness();

    const snapshot = await harness.useCase.getQuotaSnapshot({
      organizationId: authenticatedContext.organizationId,
      environment: "staging"
    });

    expect(snapshot).toMatchObject({
      environment: "staging",
      fixedDayTokenLimit: 2_000_000,
      syncRequestsPerMinutePerApiKey: 60,
      maxBatchItemsPerJob: 500,
      maxActiveBatchesPerOrganizationEnvironment: 5
    });
    expect(harness.quotaRequests).toHaveLength(1);
    expect(harness.quotaRequests[0]).toMatchObject({
      environment: "staging",
      fixedDayTokenLimit: 2_000_000,
      syncRequestsPerMinutePerApiKey: 60,
      maxBatchItemsPerJob: 500,
      maxActiveBatchesPerOrganizationEnvironment: 5,
      asOf: fixedClock()
    });
  });
});
