import { describe, expect, it } from "vitest";
import { PlacementScoringPolicy } from "../../../src/config/PlacementScoringPolicy.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";

describe("PlacementScoringPolicy", () => {
  it("accepts warm model expiries within fifteen minutes", () => {
    const policy = PlacementScoringPolicy.createDefault();

    expect(() => {
      policy.validateWarmModelExpiry(
        new Date("2026-03-10T10:14:59.000Z"),
        new Date("2026-03-10T10:00:00.000Z")
      );
    }).not.toThrow();
  });

  it("rejects warm model expiries that are not in the future", () => {
    const policy = PlacementScoringPolicy.createDefault();

    expect(() => {
      policy.validateWarmModelExpiry(
        new Date("2026-03-10T10:00:00.000Z"),
        new Date("2026-03-10T10:00:00.000Z")
      );
    }).toThrow(DomainValidationError);
  });

  it("rejects warm model expiries beyond fifteen minutes", () => {
    const policy = PlacementScoringPolicy.createDefault();

    expect(() => {
      policy.validateWarmModelExpiry(
        new Date("2026-03-10T10:15:01.000Z"),
        new Date("2026-03-10T10:00:00.000Z")
      );
    }).toThrow(DomainValidationError);
  });
});
