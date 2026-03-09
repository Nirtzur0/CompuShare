import { createHash } from "node:crypto";
import { DomainValidationError } from "./DomainValidationError.js";

export class OrganizationApiKeySecret {
  private constructor(public readonly value: string) {}

  public static create(rawValue: string): OrganizationApiKeySecret {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 24 || normalizedValue.length > 256) {
      throw new DomainValidationError(
        "Organization API key secret must be between 24 and 256 characters."
      );
    }

    return new OrganizationApiKeySecret(normalizedValue);
  }

  public toHash(): string {
    return createHash("sha256").update(this.value).digest("hex");
  }

  public toPrefix(): string {
    return this.value.slice(0, 12);
  }
}
