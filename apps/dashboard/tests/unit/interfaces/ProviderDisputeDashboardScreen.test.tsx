import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderDisputeDashboard } from "../../../src/domain/provider/ProviderDisputeDashboard.js";
import { ProviderDisputeDashboardScreen } from "../../../src/interfaces/react/ProviderDisputeDashboardScreen.js";

describe("ProviderDisputeDashboardScreen", () => {
  it("renders provider dispute summaries and historical allocation visibility", () => {
    const dashboard = ProviderDisputeDashboard.create({
      organizationId: "provider-org",
      actorRole: "finance",
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "2.50",
      recentLostDisputeCount90d: 1,
      disputes: [
        {
          id: "dispute-1",
          disputeType: "chargeback",
          source: "stripe_webhook",
          status: "recovered",
          paymentReference: "stripe_pi_001",
          jobReference: null,
          reasonCode: "fraudulent",
          summary: "Stripe dispute was lost and then recovered.",
          disputedAmountUsd: "6.00",
          allocatedAmountUsd: "2.50",
          activeHoldUsd: "0.00",
          stripeDisputeId: "dp_001",
          stripeChargeId: "ch_001",
          stripeReason: "fraudulent",
          stripeStatus: "won",
          createdAt: "2026-03-10T12:00:00.000Z",
          updatedAt: "2026-03-10T12:10:00.000Z",
          resolvedAt: "2026-03-10T12:10:00.000Z",
        },
      ],
    });

    render(<ProviderDisputeDashboardScreen dashboard={dashboard} />);

    expect(
      screen.getByRole("heading", {
        name: /provider disputes for provider-org/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Active dispute hold")).toBeTruthy();
    expect(screen.getByText("$2.50")).toBeTruthy();
    expect(screen.getByText("Stripe dispute was lost and then recovered.")).toBeTruthy();
    expect(screen.getByText(/Disputed \$6.00; allocated \$2.50/)).toBeTruthy();
    expect(screen.getByText("recovered")).toBeTruthy();
  });
});
