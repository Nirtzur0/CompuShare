import { DomainValidationError } from "../identity/DomainValidationError.js";

export const providerNodeAttestationTypeValues = ["tpm_quote_v1"] as const;

export type ProviderNodeAttestationType =
  (typeof providerNodeAttestationTypeValues)[number];

export function parseProviderNodeAttestationType(
  rawValue: string
): ProviderNodeAttestationType {
  if (
    providerNodeAttestationTypeValues.includes(
      rawValue as ProviderNodeAttestationType
    )
  ) {
    return rawValue as ProviderNodeAttestationType;
  }

  throw new DomainValidationError(
    `Unsupported provider node attestation type: ${rawValue}.`
  );
}
