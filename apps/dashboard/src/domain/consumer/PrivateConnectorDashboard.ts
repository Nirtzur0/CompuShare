export type PrivateConnectorMode = "cluster" | "byok_api";
export type PrivateConnectorStatus = "pending" | "ready" | "stale" | "disabled";

export interface PrivateConnectorDashboardSnapshot {
  organizationId: string;
  actorRole: "owner" | "admin" | "developer" | "finance";
  readyConnectorCount: number;
  staleConnectorCount: number;
  connectors: {
    id: string;
    label: string;
    environment: "development" | "staging" | "production";
    mode: PrivateConnectorMode;
    status: PrivateConnectorStatus;
    endpointUrl: string;
    runtimeVersion: string | null;
    lastCheckInAt: string | null;
    modelMappings: {
      requestModelAlias: string;
      upstreamModelId: string;
    }[];
  }[];
}

export class PrivateConnectorDashboard {
  private constructor(
    private readonly snapshot: PrivateConnectorDashboardSnapshot,
  ) {}

  public static create(
    snapshot: PrivateConnectorDashboardSnapshot,
  ): PrivateConnectorDashboard {
    return new PrivateConnectorDashboard(snapshot);
  }

  public toSnapshot(): PrivateConnectorDashboardSnapshot {
    return {
      organizationId: this.snapshot.organizationId,
      actorRole: this.snapshot.actorRole,
      readyConnectorCount: this.snapshot.readyConnectorCount,
      staleConnectorCount: this.snapshot.staleConnectorCount,
      connectors: this.snapshot.connectors.map((connector) => ({
        ...connector,
        modelMappings: connector.modelMappings.map((mapping) => ({ ...mapping })),
      })),
    };
  }

  public get title(): string {
    return `Private connectors for ${this.snapshot.organizationId}`;
  }

  public get actorRole(): PrivateConnectorDashboardSnapshot["actorRole"] {
    return this.snapshot.actorRole;
  }

  public get connectors(): readonly PrivateConnectorDashboardSnapshot["connectors"][number][] {
    return this.snapshot.connectors;
  }

  public get readyConnectorCount(): number {
    return this.snapshot.readyConnectorCount;
  }

  public get staleConnectorCount(): number {
    return this.snapshot.staleConnectorCount;
  }

  public get pendingConnectorCount(): number {
    return this.snapshot.connectors.filter(
      (connector) => connector.status === "pending",
    ).length;
  }

  public get disabledConnectorCount(): number {
    return this.snapshot.connectors.filter(
      (connector) => connector.status === "disabled",
    ).length;
  }
}
