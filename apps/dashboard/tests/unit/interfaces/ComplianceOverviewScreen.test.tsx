import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ComplianceOverviewScreen } from "../../../src/interfaces/react/ComplianceOverviewScreen.js";

describe("ComplianceOverviewScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders compliance overview data and the export link", () => {
    render(
      <ComplianceOverviewScreen
        controlPlaneBaseUrl="http://127.0.0.1:3100"
        organizationId="org-123"
        actorUserId="user-123"
        environment="development"
        initialSnapshot={{
          organizationId: "org-123",
          actorRole: "finance",
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: "development",
            providerAppendixStatus: "available",
            platformSubprocessors: [
              {
                vendorName: "Stripe",
                purpose: "Billing and payouts",
                dataCategories: ["transaction metadata"],
                regions: ["United States"],
                transferMechanism: "SCCs where required",
                activationCondition: "Only when billing is enabled.",
                status: "conditional",
                lastReviewedAt: "2026-03-10",
              },
            ],
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
                routableNodeCount: 1,
              },
            ],
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /compliance overview for org-123/i }),
    ).toBeTruthy();
    expect(screen.getByText("Provider One")).toBeTruthy();
    const exportLink = screen.getByRole("link", { name: /download dpa markdown/i });
    expect(exportLink.getAttribute("href")).toContain(
      "/v1/organizations/org-123/compliance/dpa-export?actorUserId=user-123&environment=development",
    );
  });

  it("renders the explicit empty provider appendix state", () => {
    render(
      <ComplianceOverviewScreen
        controlPlaneBaseUrl="http://127.0.0.1:3100"
        organizationId="org-123"
        actorUserId="user-123"
        environment="staging"
        initialSnapshot={{
          organizationId: "org-123",
          actorRole: "finance",
          registry: {
            generatedAt: "2026-03-10T12:00:00.000Z",
            legalEntityName: "CompuShare, Inc.",
            privacyEmail: "privacy@example.com",
            securityEmail: "security@example.com",
            dpaEffectiveDate: "2026-03-10",
            dpaVersion: "2026.03",
            environment: "staging",
            providerAppendixStatus: "none_routable",
            platformSubprocessors: [],
            providerSubprocessors: [],
          },
        }}
      />,
    );

    expect(
      screen.getByText(/no provider organizations are currently routable/i),
    ).toBeTruthy();
  });
});
