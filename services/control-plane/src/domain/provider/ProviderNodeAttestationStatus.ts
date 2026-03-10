import { DomainValidationError } from "../identity/DomainValidationError.js";

export const providerNodeAttestationStatusValues = [
  "none",
  "pending",
  "verified",
  "expired",
  "failed"
] as const;

export type ProviderNodeAttestationStatus =
  (typeof providerNodeAttestationStatusValues)[number];

export function parseProviderNodeAttestationStatus(
  rawValue: string
): ProviderNodeAttestationStatus {
  if (
    providerNodeAttestationStatusValues.includes(
      rawValue as ProviderNodeAttestationStatus
    )
  ) {
    return rawValue as ProviderNodeAttestationStatus;
  }

  throw new DomainValidationError(
    `Unsupported provider node attestation status: ${rawValue}.`
  );
}
