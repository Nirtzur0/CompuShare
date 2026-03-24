import { describe, expect, it } from "vitest";
import { SubprocessorRegistry } from "../../../../src/domain/compliance/SubprocessorRegistry.js";

describe("SubprocessorRegistry", () => {
  const settings = {
    legalEntityName: "CompuShare, Inc.",
    privacyEmail: "privacy@example.com",
    securityEmail: "security@example.com",
    dpaEffectiveDate: "2026-03-10",
    dpaVersion: "2026.03"
  };

  it("marks the provider appendix as not applicable when no environment is selected", () => {
    expect(
      SubprocessorRegistry.create({
        generatedAt: new Date("2026-03-10T12:00:00.000Z"),
        settings,
        environment: null,
        platformSubprocessors: []
      }).toSnapshot().providerAppendixStatus
    ).toBe("not_applicable");
  });

  it("marks the provider appendix as none_routable when the environment has no providers", () => {
    expect(
      SubprocessorRegistry.create({
        generatedAt: new Date("2026-03-10T12:00:00.000Z"),
        settings,
        environment: "development",
        platformSubprocessors: [],
        providerSubprocessors: []
      }).toSnapshot().providerAppendixStatus
    ).toBe("none_routable");
  });

  it("marks the provider appendix as available when routable providers exist", () => {
    expect(
      SubprocessorRegistry.create({
        generatedAt: new Date("2026-03-10T12:00:00.000Z"),
        settings,
        environment: "development",
        platformSubprocessors: [],
        providerSubprocessors: [
          {
            organizationId: "provider-1",
            organizationName: "Provider One",
            organizationSlug: "provider-one",
            environment: "development",
            regions: ["eu-central-1"],
            trustTierCeiling: "t1_vetted",
            hasActiveAttestation: true,
            routingAvailable: true,
            routableNodeCount: 1
          }
        ]
      }).toSnapshot().providerAppendixStatus
    ).toBe("available");
  });
});
