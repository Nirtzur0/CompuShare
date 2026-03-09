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
      ]
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
      ]
    });
  });
});
