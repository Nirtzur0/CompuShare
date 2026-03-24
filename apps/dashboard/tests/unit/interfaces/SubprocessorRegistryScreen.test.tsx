import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubprocessorRegistryScreen } from "../../../src/interfaces/react/SubprocessorRegistryScreen.js";

describe("SubprocessorRegistryScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the public registry summary and platform subprocessors", () => {
    render(
      <SubprocessorRegistryScreen
        initialSnapshot={{
          generatedAt: "2026-03-10T12:00:00.000Z",
          legalEntityName: "CompuShare, Inc.",
          privacyEmail: "privacy@example.com",
          securityEmail: "security@example.com",
          dpaEffectiveDate: "2026-03-10",
          dpaVersion: "2026.03",
          environment: null,
          providerAppendixStatus: "not_applicable",
          providerSubprocessors: [],
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
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /compushare, inc. subprocessors/i }),
    ).toBeTruthy();
    expect(screen.getByText("Stripe")).toBeTruthy();
    expect(screen.getByText(/buyer scoped/i)).toBeTruthy();
  });
});
