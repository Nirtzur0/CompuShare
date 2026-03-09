import { describe, expect, it } from "vitest";
import { OrganizationApiKey } from "../../../src/domain/identity/OrganizationApiKey.js";

describe("OrganizationApiKey", () => {
  it("issues a new API key with a default creation time when none is provided", () => {
    const beforeIssue = Date.now();
    const apiKey = OrganizationApiKey.issue({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      label: "Staging key",
      environment: "staging",
      secretHash:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      secretPrefix: "csk_stage___",
      issuedByUserId: "e501cc40-c479-4046-9ab5-5c7118796534"
    });
    const afterIssue = Date.now();

    expect(apiKey).toMatchObject({
      organizationId: { value: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6" },
      label: { value: "Staging key" },
      environment: "staging",
      secretPrefix: "csk_stage___",
      issuedByUserId: { value: "e501cc40-c479-4046-9ab5-5c7118796534" },
      lastUsedAt: null
    });
    expect(apiKey.createdAt.getTime()).toBeGreaterThanOrEqual(beforeIssue);
    expect(apiKey.createdAt.getTime()).toBeLessThanOrEqual(afterIssue);
  });

  it("rehydrates a persisted API key and records usage timestamps", () => {
    const apiKey = OrganizationApiKey.rehydrate({
      id: "9aeb3f2d-0f95-40ed-bd65-0a2582d5333c",
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      label: "CI deploy key",
      environment: "production",
      secretHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      secretPrefix: "csk_example_",
      issuedByUserId: "e501cc40-c479-4046-9ab5-5c7118796534",
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      lastUsedAt: null
    });
    const usedApiKey = apiKey.registerUsage(
      new Date("2026-03-09T14:00:00.000Z")
    );

    expect(apiKey.lastUsedAt).toBeNull();
    expect(usedApiKey).toMatchObject({
      id: { value: "9aeb3f2d-0f95-40ed-bd65-0a2582d5333c" },
      organizationId: { value: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6" },
      label: { value: "CI deploy key" },
      environment: "production",
      secretPrefix: "csk_example_",
      issuedByUserId: { value: "e501cc40-c479-4046-9ab5-5c7118796534" },
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      lastUsedAt: new Date("2026-03-09T14:00:00.000Z")
    });
  });
});
