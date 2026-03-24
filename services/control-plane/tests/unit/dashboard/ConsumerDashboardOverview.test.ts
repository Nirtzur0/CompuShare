import { describe, expect, it } from "vitest";
import { ConsumerDashboardOverview } from "../../../src/domain/dashboard/ConsumerDashboardOverview.js";

describe("ConsumerDashboardOverview", () => {
  it("preserves the consumer dashboard spend and balance snapshot", () => {
    const overview = ConsumerDashboardOverview.create({
      organizationId: "org-123",
      actorRole: "finance",
      spendSummary: {
        lifetimeFundedUsd: "125.00",
        lifetimeSettledSpendUsd: "48.25"
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "76.75",
        spendCreditsUsd: "5.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      },
      usageTrend: [
        {
          date: "2026-03-08",
          requestCount: 2,
          totalTokens: 2048
        }
      ],
      latencyByModel: [
        {
          modelAlias: "openai/gpt-oss-120b-like",
          requestCount: 2,
          avgLatencyMs: 180,
          p95LatencyMs: 220,
          totalTokens: 2048
        }
      ],
      gatewayQuotaStatus: {
        environment: "development",
        fixedDayStartedAt: "2026-03-18T00:00:00.000Z",
        fixedDayResetsAt: "2026-03-19T00:00:00.000Z",
        fixedDayTokenLimit: 2000000,
        fixedDayUsedTokens: 2048,
        fixedDayRemainingTokens: 1997952,
        syncRequestsPerMinutePerApiKey: 60,
        maxBatchItemsPerJob: 500,
        maxActiveBatchesPerOrganizationEnvironment: 5
      }
    });

    expect(overview.toSnapshot()).toEqual({
      organizationId: "org-123",
      actorRole: "finance",
      spendSummary: {
        lifetimeFundedUsd: "125.00",
        lifetimeSettledSpendUsd: "48.25"
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "76.75",
        spendCreditsUsd: "5.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00"
      },
      usageTrend: [
        {
          date: "2026-03-08",
          requestCount: 2,
          totalTokens: 2048
        }
      ],
      latencyByModel: [
        {
          modelAlias: "openai/gpt-oss-120b-like",
          requestCount: 2,
          avgLatencyMs: 180,
          p95LatencyMs: 220,
          totalTokens: 2048
        }
      ],
      gatewayQuotaStatus: {
        environment: "development",
        fixedDayStartedAt: "2026-03-18T00:00:00.000Z",
        fixedDayResetsAt: "2026-03-19T00:00:00.000Z",
        fixedDayTokenLimit: 2000000,
        fixedDayUsedTokens: 2048,
        fixedDayRemainingTokens: 1997952,
        syncRequestsPerMinutePerApiKey: 60,
        maxBatchItemsPerJob: 500,
        maxActiveBatchesPerOrganizationEnvironment: 5
      }
    });
  });
});
