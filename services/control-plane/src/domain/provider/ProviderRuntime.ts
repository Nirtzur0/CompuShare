import { DomainValidationError } from "../identity/DomainValidationError.js";

export const providerRuntimeValues = ["linux", "kubernetes"] as const;

export type ProviderRuntime = (typeof providerRuntimeValues)[number];

export function parseProviderRuntime(rawValue: string): ProviderRuntime {
  if (providerRuntimeValues.includes(rawValue as ProviderRuntime)) {
    return rawValue as ProviderRuntime;
  }

  throw new DomainValidationError(`Unsupported provider runtime: ${rawValue}.`);
}
