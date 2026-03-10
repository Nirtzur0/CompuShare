import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { PrivateConnector } from "../../../domain/privateConnector/PrivateConnector.js";

export interface PrivateConnectorRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  createPrivateConnector(connector: PrivateConnector): Promise<void>;
  listPrivateConnectors(
    organizationId: OrganizationId,
    environment?: "development" | "staging" | "production"
  ): Promise<readonly PrivateConnector[]>;
  findPrivateConnectorById(
    organizationId: OrganizationId,
    connectorId: string
  ): Promise<PrivateConnector | null>;
  savePrivateConnector(connector: PrivateConnector): Promise<void>;
}
