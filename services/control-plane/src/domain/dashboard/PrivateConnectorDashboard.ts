import type {
  PrivateConnector,
  PrivateConnectorMode,
  PrivateConnectorStatus
} from "../privateConnector/PrivateConnector.js";
import type { OrganizationRole } from "../identity/OrganizationRole.js";

export interface PrivateConnectorDashboardConnectorSnapshot {
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
}

export interface PrivateConnectorDashboardSnapshot {
  organizationId: string;
  actorRole: OrganizationRole;
  readyConnectorCount: number;
  staleConnectorCount: number;
  connectors: PrivateConnectorDashboardConnectorSnapshot[];
}

export class PrivateConnectorDashboard {
  private constructor(
    public readonly organizationId: string,
    public readonly actorRole: OrganizationRole,
    public readonly connectors: readonly PrivateConnectorDashboardConnectorSnapshot[]
  ) {}

  public static create(input: {
    organizationId: string;
    actorRole: OrganizationRole;
    connectors: readonly {
      connector: PrivateConnector;
      status: PrivateConnectorStatus;
    }[];
  }): PrivateConnectorDashboard {
    return new PrivateConnectorDashboard(
      input.organizationId,
      input.actorRole,
      input.connectors.map((entry) => ({
        id: entry.connector.id,
        label: entry.connector.label,
        environment: entry.connector.environment,
        mode: entry.connector.mode,
        status: entry.status,
        endpointUrl: entry.connector.endpointUrl,
        runtimeVersion: entry.connector.runtimeVersion,
        lastCheckInAt: entry.connector.lastCheckInAt?.toISOString() ?? null,
        modelMappings: entry.connector.modelMappings.map((mapping) =>
          mapping.toSnapshot()
        )
      }))
    );
  }

  public toSnapshot(): PrivateConnectorDashboardSnapshot {
    return {
      organizationId: this.organizationId,
      actorRole: this.actorRole,
      readyConnectorCount: this.connectors.filter(
        (connector) => connector.status === "ready"
      ).length,
      staleConnectorCount: this.connectors.filter(
        (connector) => connector.status === "stale"
      ).length,
      connectors: this.connectors.map((connector) => ({
        ...connector,
        modelMappings: connector.modelMappings.map((mapping) => ({ ...mapping }))
      }))
    };
  }
}
