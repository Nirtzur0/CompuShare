import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { ProviderWarmModelState } from "../../../src/domain/provider/ProviderWarmModelState.js";

describe("ProviderWarmModelState", () => {
  it("trims aliases and exposes snapshots", () => {
    const state = ProviderWarmModelState.declare({
      approvedModelAlias: " openai/gpt-oss-120b-like ",
      declaredAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:10:00.000Z")
    });

    expect(state.toSnapshot()).toEqual({
      approvedModelAlias: "openai/gpt-oss-120b-like",
      declaredAt: "2026-03-10T10:00:00.000Z",
      expiresAt: "2026-03-10T10:10:00.000Z"
    });
    expect(state.isExpired(new Date("2026-03-10T10:09:59.000Z"))).toBe(false);
    expect(state.isExpired(new Date("2026-03-10T10:10:00.000Z"))).toBe(true);
  });

  it("rejects aliases outside the allowed length range", () => {
    expect(() =>
      ProviderWarmModelState.declare({
        approvedModelAlias: "ab",
        declaredAt: new Date("2026-03-10T10:00:00.000Z"),
        expiresAt: new Date("2026-03-10T10:10:00.000Z")
      })
    ).toThrow(DomainValidationError);
  });

  it("rejects expiries that are not later than declaration", () => {
    expect(() =>
      ProviderWarmModelState.declare({
        approvedModelAlias: "openai/gpt-oss-120b-like",
        declaredAt: new Date("2026-03-10T10:00:00.000Z"),
        expiresAt: new Date("2026-03-10T10:00:00.000Z")
      })
    ).toThrow(DomainValidationError);
  });
});
