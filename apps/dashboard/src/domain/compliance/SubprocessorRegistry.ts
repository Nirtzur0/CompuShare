export type PlatformSubprocessorStatus = "active" | "conditional";

export interface PlatformSubprocessorSnapshot {
  vendorName: string;
  purpose: string;
  dataCategories: string[];
  regions: string[];
  transferMechanism: string;
  activationCondition: string | null;
  status: PlatformSubprocessorStatus;
  lastReviewedAt: string;
}

export interface ProviderSubprocessorSnapshot {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  environment: "development" | "staging" | "production";
  regions: string[];
  trustTierCeiling: "t0_community" | "t1_vetted" | "t2_attested" | null;
  hasActiveAttestation: boolean;
  routingAvailable: boolean;
  routableNodeCount: number;
}

export interface SubprocessorRegistrySnapshot {
  generatedAt: string;
  legalEntityName: string;
  privacyEmail: string;
  securityEmail: string;
  dpaEffectiveDate: string;
  dpaVersion: string;
  environment: "development" | "staging" | "production" | null;
  platformSubprocessors: PlatformSubprocessorSnapshot[];
  providerSubprocessors: ProviderSubprocessorSnapshot[];
  providerAppendixStatus: "not_applicable" | "available" | "none_routable";
}

export class SubprocessorRegistry {
  private constructor(
    private readonly snapshot: SubprocessorRegistrySnapshot
  ) {}

  public static create(snapshot: SubprocessorRegistrySnapshot): SubprocessorRegistry {
    return new SubprocessorRegistry({
      ...snapshot,
      platformSubprocessors: snapshot.platformSubprocessors.map((entry) => ({
        ...entry,
        dataCategories: [...entry.dataCategories],
        regions: [...entry.regions]
      })),
      providerSubprocessors: snapshot.providerSubprocessors.map((entry) => ({
        ...entry,
        regions: [...entry.regions]
      }))
    });
  }

  public toSnapshot(): SubprocessorRegistrySnapshot {
    return {
      ...this.snapshot,
      platformSubprocessors: this.snapshot.platformSubprocessors.map((entry) => ({
        ...entry,
        dataCategories: [...entry.dataCategories],
        regions: [...entry.regions]
      })),
      providerSubprocessors: this.snapshot.providerSubprocessors.map((entry) => ({
        ...entry,
        regions: [...entry.regions]
      }))
    };
  }

  public get title(): string {
    return `${this.snapshot.legalEntityName} subprocessors`;
  }

  public get platformSubprocessors(): readonly PlatformSubprocessorSnapshot[] {
    return this.snapshot.platformSubprocessors;
  }

  public get providerSubprocessors(): readonly ProviderSubprocessorSnapshot[] {
    return this.snapshot.providerSubprocessors;
  }

  public get providerAppendixStatus(): SubprocessorRegistrySnapshot["providerAppendixStatus"] {
    return this.snapshot.providerAppendixStatus;
  }

  public get legalEntityName(): string {
    return this.snapshot.legalEntityName;
  }

  public get dpaVersion(): string {
    return this.snapshot.dpaVersion;
  }

  public get dpaEffectiveDate(): string {
    return this.snapshot.dpaEffectiveDate;
  }

  public get privacyEmail(): string {
    return this.snapshot.privacyEmail;
  }

  public get securityEmail(): string {
    return this.snapshot.securityEmail;
  }

  public get environment(): SubprocessorRegistrySnapshot["environment"] {
    return this.snapshot.environment;
  }
}
