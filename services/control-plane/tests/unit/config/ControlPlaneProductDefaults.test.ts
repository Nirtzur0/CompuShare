import { describe, expect, it } from "vitest";
import { loadControlPlaneProductDefaults } from "../../../src/config/ControlPlaneProductDefaults.js";

describe("loadControlPlaneProductDefaults", () => {
  it("returns the canonical in-memory product registries and policies", () => {
    const defaults = loadControlPlaneProductDefaults();

    expect(
      defaults.approvedChatModelCatalog.findByAlias("openai/gpt-oss-120b-like")
    ).not.toBeNull();
    expect(
      defaults.approvedEmbeddingModelCatalog.findByAlias("cheap-embed-v1")
    ).not.toBeNull();
    expect(defaults.platformSubprocessors).toHaveLength(1);
    expect(defaults.providerNodeAttestationPolicy.challengeTtlMinutes).toBe(5);
    expect(defaults.placementScoringPolicy.warmCacheMultiplier).toBeGreaterThan(
      1
    );
  });
});
