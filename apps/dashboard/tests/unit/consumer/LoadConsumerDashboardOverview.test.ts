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
    });
    const loader = new LoadConsumerDashboardOverview({
      getConsumerDashboardOverview: () => Promise.resolve(expectedOverview),
    });

    await expect(
      loader.execute({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).resolves.toBe(expectedOverview);
  });
});
