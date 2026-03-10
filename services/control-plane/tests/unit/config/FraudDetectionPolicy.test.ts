import { describe, expect, it } from "vitest";
import { FraudDetectionPolicy } from "../../../src/config/FraudDetectionPolicy.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";

describe("FraudDetectionPolicy", () => {
  it("returns the default lookback when one is not requested", () => {
    const policy = FraudDetectionPolicy.createDefault();

    expect(policy.resolveLookbackDays()).toBe(30);
  });

  it("accepts lookbacks within the configured window", () => {
    const policy = FraudDetectionPolicy.createDefault();

    expect(policy.resolveLookbackDays(7)).toBe(7);
    expect(policy.resolveLookbackDays(90)).toBe(90);
  });

  it("rejects lookbacks outside the configured window", () => {
    const policy = FraudDetectionPolicy.createDefault();

    expect(() => policy.resolveLookbackDays(6)).toThrow(DomainValidationError);
    expect(() => policy.resolveLookbackDays(91)).toThrow(DomainValidationError);
  });
});
