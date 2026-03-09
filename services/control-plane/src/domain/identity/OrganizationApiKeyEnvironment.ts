import { DomainValidationError } from "./DomainValidationError.js";

export const organizationApiKeyEnvironmentValues = [
  "development",
  "staging",
  "production"
] as const;

export type OrganizationApiKeyEnvironment =
  (typeof organizationApiKeyEnvironmentValues)[number];

export function parseOrganizationApiKeyEnvironment(
  rawValue: string
): OrganizationApiKeyEnvironment {
  if (
    organizationApiKeyEnvironmentValues.includes(
      rawValue as OrganizationApiKeyEnvironment
    )
  ) {
    return rawValue as OrganizationApiKeyEnvironment;
  }

  throw new DomainValidationError(
    `Unsupported organization API key environment: ${rawValue}.`
  );
}
