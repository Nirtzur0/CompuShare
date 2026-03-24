import { describe, expect, it } from "vitest";
import { LoadConsumerDashboardOverview } from "../../../src/application/consumer/LoadConsumerDashboardOverview.js";
import { ConsumerDashboardOverview } from "../../../src/domain/consumer/ConsumerDashboardOverview.js";

describe("LoadConsumerDashboardOverview", () => {
  it("delegates consumer overview loading to the control-plane client", async () => {
    const expectedOverview = ConsumerDashboardOverview.create({
      organizationId: "org-123",
      actorRole: "finance",
      spendSummary: {
        lifetimeFundedUsd: "100.00",
        lifetimeSettledSpendUsd: "50.00",
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "50.00",
        spendCreditsUsd: "2.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00",
      },
      usageTrend: [],
      latencyByModel: [],
      gatewayQuotaStatus: {
        environment: "development",
        fixedDayStartedAt: "2026-03-08T00:00:00.000Z",
        fixedDayResetsAt: "2026-03-09T00:00:00.000Z",
        fixedDayTokenLimit: 2000000,
        fixedDayUsedTokens: 0,
        fixedDayRemainingTokens: 2000000,
        syncRequestsPerMinutePerApiKey: 60,
        maxBatchItemsPerJob: 500,
        maxActiveBatchesPerOrganizationEnvironment: 5,
      },
    });
    const loader = new LoadConsumerDashboardOverview({
      getConsumerDashboardOverview: () => Promise.resolve(expectedOverview),
    });

    await expect(
      loader.execute({
        organizationId: "org-123",
        actorUserId: "user-123",
        environment: "development",
      }),
    ).resolves.toBe(expectedOverview);
  });
});
