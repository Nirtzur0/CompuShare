import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { loadControlPlaneSettings } from "../../../src/config/ControlPlaneSettings.js";
import { loadWorkloadManifestProvenanceSettings } from "../../../src/config/WorkloadManifestProvenanceSettings.js";

describe("loadControlPlaneSettings", () => {
  it("loads explicit host, port, database url, and workload bundle signing settings", () => {
    expect(
      loadControlPlaneSettings({
        HOST: "127.0.0.1",
        PORT: "3100",
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/compushare",
        WORKLOAD_BUNDLE_SIGNING_KEY: "local-workload-signing-secret-1234567890",
        WORKLOAD_BUNDLE_SIGNING_KEY_ID: "local-hmac-v1",
        COMPLIANCE_LEGAL_ENTITY_NAME: "CompuShare, Inc.",
        COMPLIANCE_PRIVACY_EMAIL: "privacy@example.com",
        COMPLIANCE_SECURITY_EMAIL: "security@example.com",
        COMPLIANCE_DPA_EFFECTIVE_DATE: "2026-03-10",
        COMPLIANCE_DPA_VERSION: "2026.03"
      })
    ).toEqual({
      host: "127.0.0.1",
      port: 3100,
      databaseUrl: "postgres://postgres:postgres@localhost:5432/compushare",
      workloadBundleSigningKey: "local-workload-signing-secret-1234567890",
      workloadBundleSigningKeyId: "local-hmac-v1",
      complianceLegalEntityName: "CompuShare, Inc.",
      compliancePrivacyEmail: "privacy@example.com",
      complianceSecurityEmail: "security@example.com",
      complianceDpaEffectiveDate: "2026-03-10",
      complianceDpaVersion: "2026.03"
    });
  });

  it("fails when required settings are missing", () => {
    expect(() =>
      loadControlPlaneSettings({
        HOST: "127.0.0.1",
        PORT: "3100"
      })
    ).toThrow(ZodError);
  });

  it("loads workload manifest provenance signing settings", () => {
    expect(
      loadWorkloadManifestProvenanceSettings({
        WORKLOAD_MANIFEST_SIGNING_KEY:
          "local-workload-manifest-signing-secret-1234567890",
        WORKLOAD_MANIFEST_SIGNING_KEY_ID: "ci-hmac-v1",
        WORKLOAD_MANIFEST_SIGNING_IDENTITY: "github-actions[bot]"
      })
    ).toEqual({
      workloadManifestSigningKey:
        "local-workload-manifest-signing-secret-1234567890",
      workloadManifestSigningKeyId: "ci-hmac-v1",
      workloadManifestSigningIdentity: "github-actions[bot]"
    });
  });
});
