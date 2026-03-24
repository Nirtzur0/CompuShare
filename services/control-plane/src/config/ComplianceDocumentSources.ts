import { readFileSync } from "node:fs";
import { ComplianceDocumentSettings } from "../domain/compliance/ComplianceDocumentSettings.js";

export interface ComplianceMarkdownTemplateSet {
  dpaBodyMarkdown: string;
  technicalOrganizationalMeasuresMarkdown: string;
}

export function loadComplianceDocumentSettings(
  environment: NodeJS.ProcessEnv
): ComplianceDocumentSettings {
  return ComplianceDocumentSettings.create({
    legalEntityName: requireSetting(
      environment.COMPLIANCE_LEGAL_ENTITY_NAME,
      "COMPLIANCE_LEGAL_ENTITY_NAME"
    ),
    privacyEmail: requireSetting(
      environment.COMPLIANCE_PRIVACY_EMAIL,
      "COMPLIANCE_PRIVACY_EMAIL"
    ),
    securityEmail: requireSetting(
      environment.COMPLIANCE_SECURITY_EMAIL,
      "COMPLIANCE_SECURITY_EMAIL"
    ),
    dpaEffectiveDate: requireSetting(
      environment.COMPLIANCE_DPA_EFFECTIVE_DATE,
      "COMPLIANCE_DPA_EFFECTIVE_DATE"
    ),
    dpaVersion: requireSetting(
      environment.COMPLIANCE_DPA_VERSION,
      "COMPLIANCE_DPA_VERSION"
    )
  });
}

export function loadComplianceMarkdownTemplates(): ComplianceMarkdownTemplateSet {
  return {
    dpaBodyMarkdown: loadMarkdownFile("../../../../docs/legal/dpa-body.md"),
    technicalOrganizationalMeasuresMarkdown: loadMarkdownFile(
      "../../../../docs/legal/technical-and-organizational-measures.md"
    )
  };
}

function loadMarkdownFile(relativePath: string): string {
  const value = readFileSync(new URL(relativePath, import.meta.url), "utf8").trim();

  if (value.length === 0) {
    throw new Error(`Compliance markdown source "${relativePath}" is empty.`);
  }

  return value;
}

function requireSetting(
  value: string | undefined,
  name: string
): string {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return normalized;
}
