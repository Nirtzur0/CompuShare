import type { ComplianceDocumentSettingsSnapshot } from "./ComplianceDocumentSettings.js";
import type { PlatformSubprocessorSnapshot } from "./PlatformSubprocessor.js";
import type { ProviderSubprocessorSnapshot } from "./ProviderSubprocessor.js";
import type { PrivateConnectorEnvironment } from "../privateConnector/PrivateConnector.js";

export interface SubprocessorRegistrySnapshot {
  generatedAt: string;
  legalEntityName: string;
  privacyEmail: string;
  securityEmail: string;
  dpaEffectiveDate: string;
  dpaVersion: string;
  environment: PrivateConnectorEnvironment | null;
  platformSubprocessors: PlatformSubprocessorSnapshot[];
  providerSubprocessors: ProviderSubprocessorSnapshot[];
  providerAppendixStatus: "not_applicable" | "available" | "none_routable";
}

export class SubprocessorRegistry {
  private constructor(
    private readonly snapshot: SubprocessorRegistrySnapshot
  ) {}

  public static create(input: {
    generatedAt: Date;
    settings: ComplianceDocumentSettingsSnapshot;
    environment: PrivateConnectorEnvironment | null;
    platformSubprocessors: readonly PlatformSubprocessorSnapshot[];
    providerSubprocessors?: readonly ProviderSubprocessorSnapshot[];
  }): SubprocessorRegistry {
    const providerSubprocessors = [...(input.providerSubprocessors ?? [])];

    return new SubprocessorRegistry({
      generatedAt: input.generatedAt.toISOString(),
      legalEntityName: input.settings.legalEntityName,
      privacyEmail: input.settings.privacyEmail,
      securityEmail: input.settings.securityEmail,
      dpaEffectiveDate: input.settings.dpaEffectiveDate,
      dpaVersion: input.settings.dpaVersion,
      environment: input.environment,
      platformSubprocessors: input.platformSubprocessors.map((entry) => ({
        ...entry,
        dataCategories: [...entry.dataCategories],
        regions: [...entry.regions]
      })),
      providerSubprocessors: providerSubprocessors.map((entry) => ({
        ...entry,
        regions: [...entry.regions]
      })),
      providerAppendixStatus:
        input.environment === null
          ? "not_applicable"
          : providerSubprocessors.length === 0
            ? "none_routable"
            : "available"
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
}
