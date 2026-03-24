import type { OrganizationRole } from "../identity/OrganizationRole.js";
import type { SubprocessorRegistrySnapshot } from "./SubprocessorRegistry.js";

export interface ComplianceOverviewSnapshot {
  organizationId: string;
  actorRole: OrganizationRole;
  registry: SubprocessorRegistrySnapshot;
}

export class ComplianceOverview {
  private constructor(
    private readonly snapshot: ComplianceOverviewSnapshot
  ) {}

  public static create(
    snapshot: ComplianceOverviewSnapshot
  ): ComplianceOverview {
    return new ComplianceOverview({
      ...snapshot,
      registry: {
        ...snapshot.registry,
        platformSubprocessors: snapshot.registry.platformSubprocessors.map(
          (entry) => ({
            ...entry,
            dataCategories: [...entry.dataCategories],
            regions: [...entry.regions]
          })
        ),
        providerSubprocessors: snapshot.registry.providerSubprocessors.map(
          (entry) => ({
            ...entry,
            regions: [...entry.regions]
          })
        )
      }
    });
  }

  public toSnapshot(): ComplianceOverviewSnapshot {
    return {
      ...this.snapshot,
      registry: {
        ...this.snapshot.registry,
        platformSubprocessors: this.snapshot.registry.platformSubprocessors.map(
          (entry) => ({
            ...entry,
            dataCategories: [...entry.dataCategories],
            regions: [...entry.regions]
          })
        ),
        providerSubprocessors: this.snapshot.registry.providerSubprocessors.map(
          (entry) => ({
            ...entry,
            regions: [...entry.regions]
          })
        )
      }
    };
  }
}
