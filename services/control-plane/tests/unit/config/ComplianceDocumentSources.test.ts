import { describe, expect, it } from "vitest";
import {
  loadComplianceDocumentSettings,
  loadComplianceMarkdownTemplates
} from "../../../src/config/ComplianceDocumentSources.js";

describe("ComplianceDocumentSources", () => {
  it("loads required compliance settings", () => {
    expect(
      loadComplianceDocumentSettings({
        COMPLIANCE_LEGAL_ENTITY_NAME: "CompuShare, Inc.",
        COMPLIANCE_PRIVACY_EMAIL: "privacy@example.com",
        COMPLIANCE_SECURITY_EMAIL: "security@example.com",
        COMPLIANCE_DPA_EFFECTIVE_DATE: "2026-03-10",
        COMPLIANCE_DPA_VERSION: "2026.03"
      }).toSnapshot()
    ).toEqual({
      legalEntityName: "CompuShare, Inc.",
      privacyEmail: "privacy@example.com",
      securityEmail: "security@example.com",
      dpaEffectiveDate: "2026-03-10",
      dpaVersion: "2026.03"
    });
  });

  it("fails fast when a required compliance setting is missing", () => {
    expect(() =>
      loadComplianceDocumentSettings({
        COMPLIANCE_LEGAL_ENTITY_NAME: "CompuShare, Inc.",
        COMPLIANCE_PRIVACY_EMAIL: "privacy@example.com",
        COMPLIANCE_SECURITY_EMAIL: "security@example.com",
        COMPLIANCE_DPA_EFFECTIVE_DATE: "2026-03-10"
      })
    ).toThrow("COMPLIANCE_DPA_VERSION is required.");
  });

  it("loads repo-tracked markdown templates", () => {
    const templates = loadComplianceMarkdownTemplates();

    expect(templates.dpaBodyMarkdown).toContain("# Data Processing Addendum");
    expect(templates.technicalOrganizationalMeasuresMarkdown).toContain(
      "# Technical and Organizational Measures"
    );
  });
});
