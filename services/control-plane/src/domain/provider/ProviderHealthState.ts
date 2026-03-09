import { DomainValidationError } from "../identity/DomainValidationError.js";

export const providerHealthStateValues = [
  "healthy",
  "degraded",
  "paused"
] as const;

export type ProviderHealthState = (typeof providerHealthStateValues)[number];

export function parseProviderHealthState(
  rawValue: string
): ProviderHealthState {
  if (providerHealthStateValues.includes(rawValue as ProviderHealthState)) {
    return rawValue as ProviderHealthState;
  }

  throw new DomainValidationError(
    `Unsupported provider health state: ${rawValue}.`
  );
}
