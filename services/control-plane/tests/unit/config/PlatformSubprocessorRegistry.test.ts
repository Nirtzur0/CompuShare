import { describe, expect, it } from "vitest";
import { loadPlatformSubprocessorRegistry } from "../../../src/config/PlatformSubprocessorRegistry.js";

describe("loadPlatformSubprocessorRegistry", () => {
  it("loads the repo-tracked platform registry entries", () => {
    const registry = loadPlatformSubprocessorRegistry();

    expect(registry.map((entry) => entry.toSnapshot())).toMatchObject([
      {
        vendorName: "Stripe",
        status: "conditional"
      }
    ]);
  });
});
