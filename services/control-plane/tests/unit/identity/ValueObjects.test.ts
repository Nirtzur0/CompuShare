import { describe, expect, it } from "vitest";
import { InvitationToken } from "../../../src/domain/identity/InvitationToken.js";
import { OrganizationAccountProfile } from "../../../src/domain/identity/AccountCapability.js";
import { parseOrganizationApiKeyEnvironment } from "../../../src/domain/identity/OrganizationApiKeyEnvironment.js";
import { OrganizationApiKeyLabel } from "../../../src/domain/identity/OrganizationApiKeyLabel.js";
import { OrganizationApiKeySecret } from "../../../src/domain/identity/OrganizationApiKeySecret.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { EmailAddress } from "../../../src/domain/identity/EmailAddress.js";
import { OrganizationName } from "../../../src/domain/identity/OrganizationName.js";
import { OrganizationSlug } from "../../../src/domain/identity/OrganizationSlug.js";
import { User } from "../../../src/domain/identity/User.js";
import { ProviderMachineId } from "../../../src/domain/provider/ProviderMachineId.js";
import { parseProviderRuntime } from "../../../src/domain/provider/ProviderRuntime.js";
import { parseProviderTrustTier } from "../../../src/domain/provider/ProviderTrustTier.js";

describe("identity value objects", () => {
  it("normalizes valid email addresses", () => {
    expect(EmailAddress.create(" Founder@Example.com ").value).toBe(
      "founder@example.com"
    );
  });

  it("rejects malformed email addresses", () => {
    expect(() => EmailAddress.create("bad-email")).toThrow(
      DomainValidationError
    );
  });

  it("rejects invalid organization names", () => {
    expect(() => OrganizationName.create("AI")).toThrow(DomainValidationError);
  });

  it("rejects invalid organization slugs", () => {
    expect(() => OrganizationSlug.create("No Spaces")).toThrow(
      DomainValidationError
    );
  });

  it("requires at least one supported account capability", () => {
    expect(() => OrganizationAccountProfile.create([])).toThrow(
      DomainValidationError
    );
    expect(() =>
      OrganizationAccountProfile.create(["buyer", "reseller"])
    ).toThrow(DomainValidationError);
  });

  it("rejects invalid display names", () => {
    expect(() =>
      User.createNew({
        email: EmailAddress.create("founder@example.com"),
        displayName: " ",
        createdAt: new Date("2026-03-09T00:00:00.000Z")
      })
    ).toThrow(DomainValidationError);
  });

  it("rejects invitation tokens that are too short", () => {
    expect(() => InvitationToken.create("short-token")).toThrow(
      DomainValidationError
    );
  });

  it("parses supported organization API key environments", () => {
    expect(parseOrganizationApiKeyEnvironment("production")).toBe("production");
  });

  it("rejects unsupported organization API key environments", () => {
    expect(() => parseOrganizationApiKeyEnvironment("qa")).toThrow(
      DomainValidationError
    );
  });

  it("rejects invalid organization API key labels", () => {
    expect(() => OrganizationApiKeyLabel.create("  ")).toThrow(
      DomainValidationError
    );
  });

  it("derives a stable hash and prefix from an organization API key secret", () => {
    const secret = OrganizationApiKeySecret.create(
      "csk_example_secret_value_000000"
    );

    expect(secret.toHash()).toHaveLength(64);
    expect(secret.toPrefix()).toBe("csk_example_");
  });

  it("rejects organization API key secrets that are too short", () => {
    expect(() => OrganizationApiKeySecret.create("short-secret")).toThrow(
      DomainValidationError
    );
  });

  it("parses supported provider runtimes and trust tiers", () => {
    expect(parseProviderRuntime("linux")).toBe("linux");
    expect(parseProviderTrustTier("t1_vetted")).toBe("t1_vetted");
  });

  it("rejects invalid provider machine IDs", () => {
    expect(() => ProviderMachineId.create("bad id")).toThrow(
      DomainValidationError
    );
  });
});
