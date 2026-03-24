import {
  SubprocessorRegistry,
  type SubprocessorRegistrySnapshot
} from "../compliance/SubprocessorRegistry.js";

export interface ComplianceOverviewSnapshot {
  organizationId: string;
  actorRole: "owner" | "admin" | "developer" | "finance";
  registry: SubprocessorRegistrySnapshot;
}

export class ComplianceOverview {
  private constructor(
    private readonly snapshot: ComplianceOverviewSnapshot
  ) {}

  public static create(snapshot: ComplianceOverviewSnapshot): ComplianceOverview {
    return new ComplianceOverview({
      ...snapshot,
      registry: SubprocessorRegistry.create(snapshot.registry).toSnapshot()
    });
  }

  public toSnapshot(): ComplianceOverviewSnapshot {
    return {
      ...this.snapshot,
      registry: SubprocessorRegistry.create(this.snapshot.registry).toSnapshot()
    };
  }

  public get title(): string {
    return `Compliance overview for ${this.snapshot.organizationId}`;
  }

  public get actorRole(): ComplianceOverviewSnapshot["actorRole"] {
    return this.snapshot.actorRole;
  }

  public get registry(): SubprocessorRegistry {
    return SubprocessorRegistry.create(this.snapshot.registry);
  }
}
