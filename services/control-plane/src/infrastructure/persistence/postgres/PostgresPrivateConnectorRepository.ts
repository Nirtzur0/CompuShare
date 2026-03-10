import type { Pool } from "pg";
import type { PrivateConnectorDashboardRepository } from "../../../application/dashboard/ports/PrivateConnectorDashboardRepository.js";
import type { PrivateConnectorRepository } from "../../../application/privateConnector/ports/PrivateConnectorRepository.js";
import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import { parseOrganizationRole } from "../../../domain/identity/OrganizationRole.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import { PrivateConnector } from "../../../domain/privateConnector/PrivateConnector.js";

interface OrganizationCapabilitiesRow {
  account_capabilities: string[];
}

interface OrganizationMemberRow {
  user_id: string;
  role: string;
  joined_at: Date;
}

interface PrivateConnectorRow {
  id: string;
  organization_id: string;
  environment: "development" | "staging" | "production";
  label: string;
  mode: "cluster" | "byok_api";
  endpoint_url: string;
  runtime_version: string | null;
  created_at: Date;
  last_check_in_at: Date | null;
  last_ready_at: Date | null;
  disabled_at: Date | null;
}

interface PrivateConnectorModelMappingRow {
  private_connector_id: string;
  request_model_alias: string;
  upstream_model_id: string;
}

export class PostgresPrivateConnectorRepository
  implements PrivateConnectorRepository, PrivateConnectorDashboardRepository
{
  public constructor(private readonly pool: Pick<Pool, "query">) {}

  public async findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null> {
    const result = await this.pool.query<OrganizationCapabilitiesRow>(
      `
        SELECT account_capabilities
        FROM organizations
        WHERE id = $1
      `,
      [organizationId.value]
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return row.account_capabilities.filter(
      (capability): capability is AccountCapability =>
        capability === "buyer" || capability === "provider",
    );
  }

  public async findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null> {
    const result = await this.pool.query<OrganizationMemberRow>(
      `
        SELECT user_id, role, joined_at
        FROM organization_members
        WHERE organization_id = $1 AND user_id = $2
      `,
      [organizationId.value, userId.value]
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return OrganizationMember.rehydrate({
      userId: row.user_id,
      role: parseOrganizationRole(row.role),
      joinedAt: row.joined_at
    });
  }

  public async createPrivateConnector(connector: PrivateConnector): Promise<void> {
    const snapshot = connector.toSnapshot();

    await this.pool.query(
      `
        INSERT INTO private_connectors (
          id,
          organization_id,
          environment,
          label,
          mode,
          endpoint_url,
          runtime_version,
          created_at,
          last_check_in_at,
          last_ready_at,
          disabled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        snapshot.id,
        snapshot.organizationId,
        snapshot.environment,
        snapshot.label,
        snapshot.mode,
        snapshot.endpointUrl,
        snapshot.runtimeVersion,
        snapshot.createdAt,
        snapshot.lastCheckInAt,
        snapshot.lastReadyAt,
        snapshot.disabledAt
      ]
    );

    for (const [ordinal, mapping] of snapshot.modelMappings.entries()) {
      await this.pool.query(
        `
          INSERT INTO private_connector_model_mappings (
            private_connector_id,
            ordinal,
            request_model_alias,
            upstream_model_id
          )
          VALUES ($1, $2, $3, $4)
        `,
        [snapshot.id, ordinal, mapping.requestModelAlias, mapping.upstreamModelId]
      );
    }
  }

  public async listPrivateConnectors(
    organizationId: OrganizationId,
    environment?: "development" | "staging" | "production"
  ): Promise<readonly PrivateConnector[]> {
    const connectors = await this.pool.query<PrivateConnectorRow>(
      environment === undefined
        ? `
            SELECT
              id,
              organization_id,
              environment,
              label,
              mode,
              endpoint_url,
              runtime_version,
              created_at,
              last_check_in_at,
              last_ready_at,
              disabled_at
            FROM private_connectors
            WHERE organization_id = $1
            ORDER BY created_at ASC
          `
        : `
            SELECT
              id,
              organization_id,
              environment,
              label,
              mode,
              endpoint_url,
              runtime_version,
              created_at,
              last_check_in_at,
              last_ready_at,
              disabled_at
            FROM private_connectors
            WHERE organization_id = $1
              AND environment = $2
            ORDER BY created_at ASC
          `,
      environment === undefined
        ? [organizationId.value]
        : [organizationId.value, environment]
    );

    return Promise.all(connectors.rows.map((row) => this.mapConnectorRow(row)));
  }

  public async findPrivateConnectorById(
    organizationId: OrganizationId,
    connectorId: string
  ): Promise<PrivateConnector | null> {
    const result = await this.pool.query<PrivateConnectorRow>(
      `
        SELECT
          id,
          organization_id,
          environment,
          label,
          mode,
          endpoint_url,
          runtime_version,
          created_at,
          last_check_in_at,
          last_ready_at,
          disabled_at
        FROM private_connectors
        WHERE organization_id = $1
          AND id = $2
      `,
      [organizationId.value, connectorId]
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return this.mapConnectorRow(row);
  }

  public async savePrivateConnector(connector: PrivateConnector): Promise<void> {
    const snapshot = connector.toSnapshot();

    await this.pool.query(
      `
        UPDATE private_connectors
        SET
          runtime_version = $2,
          last_check_in_at = $3,
          last_ready_at = $4,
          disabled_at = $5
        WHERE id = $1
      `,
      [
        snapshot.id,
        snapshot.runtimeVersion,
        snapshot.lastCheckInAt,
        snapshot.lastReadyAt,
        snapshot.disabledAt
      ]
    );
  }

  private async mapConnectorRow(row: PrivateConnectorRow): Promise<PrivateConnector> {
    const mappings = await this.pool.query<PrivateConnectorModelMappingRow>(
      `
        SELECT
          private_connector_id,
          request_model_alias,
          upstream_model_id
        FROM private_connector_model_mappings
        WHERE private_connector_id = $1
        ORDER BY ordinal ASC
      `,
      [row.id]
    );

    return PrivateConnector.rehydrate({
      id: row.id,
      organizationId: row.organization_id,
      environment: row.environment,
      label: row.label,
      mode: row.mode,
      endpointUrl: row.endpoint_url,
      modelMappings: mappings.rows.map((mapping) => ({
        requestModelAlias: mapping.request_model_alias,
        upstreamModelId: mapping.upstream_model_id
      })),
      runtimeVersion: row.runtime_version,
      createdAt: row.created_at,
      lastCheckInAt: row.last_check_in_at,
      lastReadyAt: row.last_ready_at,
      disabledAt: row.disabled_at
    });
  }
}
