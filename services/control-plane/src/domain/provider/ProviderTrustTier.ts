import { DomainValidationError } from "../identity/DomainValidationError.js";

export const providerTrustTierValues = [
  "t0_community",
  "t1_vetted",
  "t2_attested"
] as const;

export type ProviderTrustTier = (typeof providerTrustTierValues)[number];

const providerTrustTierRanks: Readonly<Record<ProviderTrustTier, number>> = {
  t0_community: 0,
  t1_vetted: 1,
  t2_attested: 2
};

export function parseProviderTrustTier(rawValue: string): ProviderTrustTier {
  if (providerTrustTierValues.includes(rawValue as ProviderTrustTier)) {
    return rawValue as ProviderTrustTier;
  }

  throw new DomainValidationError(
    `Unsupported provider trust tier: ${rawValue}.`
  );
}

export function providerTrustTierMeetsMinimum(
  actualTier: ProviderTrustTier,
  minimumTier: ProviderTrustTier
): boolean {
  return (
    providerTrustTierRanks[actualTier] >= providerTrustTierRanks[minimumTier]
  );
}
