import { describe, expect, it } from "vitest";
import { ProviderNodeAttestationPolicy } from "../../../src/config/ProviderNodeAttestationPolicy.js";

describe("ProviderNodeAttestationPolicy", () => {
  it("exposes the default TPM/Secure Boot policy snapshot", () => {
    const policy = ProviderNodeAttestationPolicy.createDefault();

    expect(policy.toSnapshot()).toMatchObject({
      challengeTtlMinutes: 5,
      freshnessHours: 24,
      requireSecureBoot: true,
      allowedPcrValues: {
        "0": [
          "1111111111111111111111111111111111111111111111111111111111111111"
        ]
      }
    });
  });
});
