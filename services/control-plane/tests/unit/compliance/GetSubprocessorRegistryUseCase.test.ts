import { describe, expect, it } from "vitest";
import { GetSubprocessorRegistryUseCase } from "../../../src/application/compliance/GetSubprocessorRegistryUseCase.js";
import { ComplianceDocumentSettings } from "../../../src/domain/compliance/ComplianceDocumentSettings.js";
import { PlatformSubprocessor } from "../../../src/domain/compliance/PlatformSubprocessor.js";

describe("GetSubprocessorRegistryUseCase", () => {
  it("returns the deterministic public registry snapshot", () => {
    const useCase = new GetSubprocessorRegistryUseCase(
      ComplianceDocumentSettings.create({
        legalEntityName: "CompuShare, Inc.",
        privacyEmail: "privacy@example.com",
        securityEmail: "security@example.com",
        dpaEffectiveDate: "2026-03-10",
        dpaVersion: "2026.03"
      }),
      [
        PlatformSubprocessor.create({
          vendorName: "Stripe",
          purpose: "Billing and payouts",
          dataCategories: ["transaction metadata"],
          regions: ["United States"],
          transferMechanism: "SCCs where required",
          activationCondition: "Only when billing is enabled.",
          status: "conditional",
          lastReviewedAt: "2026-03-10"
        })
      ],
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    expect(useCase.execute()).toEqual({
      registry: {
        generatedAt: "2026-03-10T12:00:00.000Z",
        legalEntityName: "CompuShare, Inc.",
        privacyEmail: "privacy@example.com",
        securityEmail: "security@example.com",
        dpaEffectiveDate: "2026-03-10",
        dpaVersion: "2026.03",
        environment: null,
        platformSubprocessors: [
          expect.objectContaining({
            vendorName: "Stripe"
          })
        ],
        providerSubprocessors: [],
        providerAppendixStatus: "not_applicable"
      }
    });
  });
});
