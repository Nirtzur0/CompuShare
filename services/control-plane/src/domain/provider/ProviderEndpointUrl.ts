import { DomainValidationError } from "../identity/DomainValidationError.js";

export class ProviderEndpointUrl {
  private constructor(public readonly value: string) {}

  public static create(raw: string): ProviderEndpointUrl {
    const normalized = raw.trim();
    let parsed: URL;

    try {
      parsed = new URL(normalized);
    } catch {
      throw new DomainValidationError("Provider endpoint URL must be valid.");
    }

    if (!this.isAllowedProtocol(parsed)) {
      throw new DomainValidationError(
        "Provider endpoint URL must use https unless targeting localhost."
      );
    }

    if (parsed.username.length > 0 || parsed.password.length > 0) {
      throw new DomainValidationError(
        "Provider endpoint URL must not include embedded credentials."
      );
    }

    return new ProviderEndpointUrl(parsed.toString());
  }

  private static isAllowedProtocol(parsed: URL): boolean {
    if (parsed.protocol === "https:") {
      return true;
    }

    if (parsed.protocol !== "http:") {
      return false;
    }

    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    );
  }
}
