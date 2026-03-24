import { describe, expect, it, vi } from "vitest";
import { GenerateDpaExportUseCase } from "../../../src/application/compliance/GenerateDpaExportUseCase.js";
import { ComplianceDocumentSettings } from "../../../src/domain/compliance/ComplianceDocumentSettings.js";
import { PlatformSubprocessor } from "../../../src/domain/compliance/PlatformSubprocessor.js";
import { ProviderSubprocessor } from "../../../src/domain/compliance/ProviderSubprocessor.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";

describe("GenerateDpaExportUseCase", () => {
  it("renders deterministic markdown with platform and provider appendices", async () => {
    const auditLog = {
      record: vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve())
    };
    const useCase = new GenerateDpaExportUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["buyer"] as const),
        findOrganizationMember: () =>
          Promise.resolve(
            OrganizationMember.rehydrate({
              userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
              role: "owner",
              joinedAt: new Date("2026-03-09T11:00:00.000Z")
            })
          ),
        listRoutableProviderSubprocessors: () =>
          Promise.resolve([
            ProviderSubprocessor.create({
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              organizationName: "Routable Provider",
              organizationSlug: "routable-provider",
              environment: "development",
              regions: ["eu-central-1"],
              trustTierCeiling: "t1_vetted",
              hasActiveAttestation: false,
              routingAvailable: true,
              routableNodeCount: 1
            })
          ])
      },
      auditLog,
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
      {
        dpaBodyMarkdown: "# Body\n\nCanonical DPA body.",
        technicalOrganizationalMeasuresMarkdown: "# TOMs\n\nSecurity controls."
      },
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "83f54f1f-7550-4ca3-bcd5-0cf4b104b0d8",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      environment: "development"
    });

    expect(response.fileName).toContain("83f54f1f-7550-4ca3-bcd5-0cf4b104b0d8");
    expect(response.markdown).toContain("# CompuShare Data Processing Addendum Export Pack");
    expect(response.markdown).toContain("## Canonical DPA Body");
    expect(response.markdown).toContain("Stripe");
    expect(response.markdown).toContain("Routable Provider");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "compliance.dpa_export.generated"
      })
    );
  });

  it("renders an explicit empty provider appendix when no routable providers exist", async () => {
    const useCase = new GenerateDpaExportUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["buyer"] as const),
        findOrganizationMember: () =>
          Promise.resolve(
            OrganizationMember.rehydrate({
              userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
              role: "finance",
              joinedAt: new Date("2026-03-09T11:00:00.000Z")
            })
          ),
        listRoutableProviderSubprocessors: () => Promise.resolve([])
      },
      { record: () => Promise.resolve() },
      ComplianceDocumentSettings.create({
        legalEntityName: "CompuShare, Inc.",
        privacyEmail: "privacy@example.com",
        securityEmail: "security@example.com",
        dpaEffectiveDate: "2026-03-10",
        dpaVersion: "2026.03"
      }),
      [],
      {
        dpaBodyMarkdown: "Body",
        technicalOrganizationalMeasuresMarkdown: "TOMs"
      }
    );

    const response = await useCase.execute({
      organizationId: "83f54f1f-7550-4ca3-bcd5-0cf4b104b0d8",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      environment: "staging"
    });

    expect(response.markdown).toContain(
      "No provider organizations are currently routable in the selected environment."
    );
  });
});
