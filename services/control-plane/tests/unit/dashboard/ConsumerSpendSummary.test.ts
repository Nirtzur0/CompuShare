import { describe, expect, it } from "vitest";
import { ConsumerSpendSummary } from "../../../src/domain/dashboard/ConsumerSpendSummary.js";

describe("ConsumerSpendSummary", () => {
  it("serializes funded and settled spend values as USD strings", () => {
    const summary = ConsumerSpendSummary.create({
      lifetimeFundedCents: 12500,
      lifetimeSettledSpendCents: 4825
    });

    expect(summary.toSnapshot()).toEqual({
      lifetimeFundedUsd: "125.00",
      lifetimeSettledSpendUsd: "48.25"
    });
  });
});
