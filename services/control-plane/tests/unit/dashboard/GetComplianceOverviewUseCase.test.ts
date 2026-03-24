import { describe, expect, it, vi } from "vitest";
import { GetComplianceOverviewUseCase } from "../../../src/application/dashboard/GetComplianceOverviewUseCase.js";
import { ComplianceDocumentSettings } from "../../../src/domain/compliance/ComplianceDocumentSettings.js";
import { PlatformSubprocessor } from "../../../src/domain/compliance/PlatformSubprocessor.js";
import { ProviderSubprocessor } from "../../../src/domain/compliance/ProviderSubprocessor.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";

describe("GetComplianceOverviewUseCase", () => {
  it("returns a buyer-scoped compliance overview and records audit metadata", async () => {
    const auditLog = {
      record: vi.fn<(...args: unknown[]) => Promise<void>>(() => Promise.resolve())
    };
    const repository = {
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
      listRoutableProviderSubprocessors: () =>
        Promise.resolve([
          ProviderSubprocessor.create({
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            organizationName: "Routable Provider",
            organizationSlug: "routable-provider",
            environment: "development",
            regions: ["eu-central-1"],
            trustTierCeiling: "t2_attested",
            hasActiveAttestation: true,
            routingAvailable: true,
            routableNodeCount: 2
          })
        ])
    };
    const useCase = new GetComplianceOverviewUseCase(
      repository,
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
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      environment: "development"
    });

    expect(response.overview).toMatchObject({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      registry: {
        legalEntityName: "CompuShare, Inc.",
        environment: "development",
        providerAppendixStatus: "available",
        platformSubprocessors: [{ vendorName: "Stripe" }],
        providerSubprocessors: [{ organizationSlug: "routable-provider" }]
      }
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "dashboard.compliance_overview.viewed",
        metadata: {
          environment: "development",
          platformSubprocessorCount: 1,
          providerSubprocessorCount: 1,
          providerAppendixStatus: "available"
        }
      })
    );
  });

  it("rejects organizations without buyer capability", async () => {
    const useCase = new GetComplianceOverviewUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["provider"] as const),
        findOrganizationMember: () => Promise.resolve(null),
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
      []
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development"
      })
    ).rejects.toThrow(
      "Organization must have buyer capability before loading compliance overview data."
    );
  });
});
