import type { ProviderTrustTier } from "./ProviderTrustTier.js";
import type { ProviderNodeAttestationStatus } from "./ProviderNodeAttestationStatus.js";

export function resolveEffectiveProviderTrustTier(input: {
  baseTrustTier: ProviderTrustTier;
  attestationStatus: ProviderNodeAttestationStatus;
}): ProviderTrustTier {
  if (input.attestationStatus === "verified") {
    return "t2_attested";
  }

  return input.baseTrustTier;
}
