import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsumerDashboardOverview } from "../../../src/domain/consumer/ConsumerDashboardOverview.js";
import { ConsumerDashboardScreen } from "../../../src/interfaces/react/ConsumerDashboardScreen.js";

describe("ConsumerDashboardScreen", () => {
  it("renders real consumer spend and balance cards", () => {
    const overview = ConsumerDashboardOverview.create({
      organizationId: "org-123",
      actorRole: "finance",
      spendSummary: {
        lifetimeFundedUsd: "100.00",
        lifetimeSettledSpendUsd: "50.00",
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "50.00",
        spendCreditsUsd: "5.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00",
      },
      usageTrend: [
        {
          date: "2026-03-08",
          requestCount: 1,
          totalTokens: 2048,
        },
      ],
      latencyByModel: [
        {
          modelAlias: "openai/gpt-oss-120b-like",
          requestCount: 1,
          avgLatencyMs: 180,
          p95LatencyMs: 180,
          totalTokens: 2048,
        },
      ],
    });

    render(<ConsumerDashboardScreen overview={overview} />);

    expect(
      screen.getByRole("heading", { name: /consumer overview for org-123/i }),
    ).toBeTruthy();
    expect(screen.getAllByText("Prepaid balance")).toHaveLength(2);
    expect(screen.getAllByText("$50.00")).toHaveLength(4);
    expect(screen.getAllByText("Settled spend")).toHaveLength(2);
    expect(screen.getByText("Daily usage")).toBeTruthy();
    expect(screen.getByText("Latency by model")).toBeTruthy();
  });
});
