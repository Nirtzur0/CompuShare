import { describe, expect, it } from "vitest";
import { resolveEffectiveProviderTrustTier } from "../../../src/domain/provider/resolveEffectiveProviderTrustTier.js";

describe("resolveEffectiveProviderTrustTier", () => {
  it("upgrades verified nodes to t2_attested", () => {
    expect(
      resolveEffectiveProviderTrustTier({
        baseTrustTier: "t1_vetted",
        attestationStatus: "verified"
      })
    ).toBe("t2_attested");
  });

  it("keeps non-verified nodes at their base trust tier", () => {
    expect(
      resolveEffectiveProviderTrustTier({
        baseTrustTier: "t1_vetted",
        attestationStatus: "expired"
      })
    ).toBe("t1_vetted");
  });
});
