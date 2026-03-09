import { DomainValidationError } from "./DomainValidationError.js";

export const accountCapabilityValues = ["buyer", "provider"] as const;

export type AccountCapability = (typeof accountCapabilityValues)[number];

export class OrganizationAccountProfile {
  private constructor(
    private readonly capabilities: ReadonlySet<AccountCapability>
  ) {}

  public static create(values: readonly string[]): OrganizationAccountProfile {
    const normalizedCapabilities = values.map((value) =>
      value.trim().toLowerCase()
    );

    if (normalizedCapabilities.length === 0) {
      throw new DomainValidationError(
        "At least one account capability must be selected."
      );
    }

    const capabilities = new Set<AccountCapability>();

    for (const capability of normalizedCapabilities) {
      if (!accountCapabilityValues.includes(capability as AccountCapability)) {
        throw new DomainValidationError(
          `Unsupported account capability: ${capability}.`
        );
      }

      capabilities.add(capability as AccountCapability);
    }

    return new OrganizationAccountProfile(capabilities);
  }

  public toArray(): AccountCapability[] {
    return [...this.capabilities].sort();
  }
}
