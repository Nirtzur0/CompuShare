import type { PrivateConnectorEnvironment } from "../privateConnector/PrivateConnector.js";

export type ProviderSubprocessorTrustTier =
  | "t0_community"
  | "t1_vetted"
  | "t2_attested";

export interface ProviderSubprocessorSnapshot {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  environment: PrivateConnectorEnvironment;
  regions: string[];
  trustTierCeiling: ProviderSubprocessorTrustTier | null;
  hasActiveAttestation: boolean;
  routingAvailable: boolean;
  routableNodeCount: number;
}

export class ProviderSubprocessor {
  private constructor(
    private readonly snapshot: ProviderSubprocessorSnapshot
  ) {}

  public static create(
    snapshot: ProviderSubprocessorSnapshot
  ): ProviderSubprocessor {
    return new ProviderSubprocessor({
      ...snapshot,
      regions: [...snapshot.regions]
    });
  }

  public toSnapshot(): ProviderSubprocessorSnapshot {
    return {
      ...this.snapshot,
      regions: [...this.snapshot.regions]
    };
  }
}
