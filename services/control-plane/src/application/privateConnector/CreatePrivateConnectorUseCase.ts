import type { AuditLog } from "../identity/ports/AuditLog.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import {
  canManageOrganizationFinances
} from "../../domain/identity/OrganizationRole.js";
import { PrivateConnector } from "../../domain/privateConnector/PrivateConnector.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import type { PrivateConnectorRepository } from "./ports/PrivateConnectorRepository.js";

export interface CreatePrivateConnectorRequest {
  organizationId: string;
  actorUserId: string;
  environment: "development" | "staging" | "production";
  label: string;
  mode: "cluster" | "byok_api";
  endpointUrl: string;
  modelMappings: {
    requestModelAlias: string;
    upstreamModelId: string;
  }[];
}

export interface CreatePrivateConnectorResponse {
  connector: ReturnType<PrivateConnector["toSnapshot"]>;
}

export class PrivateConnectorOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "PrivateConnectorOrganizationNotFoundError";
  }
}

export class PrivateConnectorBuyerCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have buyer capability before managing private connectors."
    );
    this.name = "PrivateConnectorBuyerCapabilityRequiredError";
  }
}

export class PrivateConnectorAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may manage private connectors."
    );
    this.name = "PrivateConnectorAuthorizationError";
  }
}

export class CreatePrivateConnectorUseCase {
  public constructor(
    private readonly repository: PrivateConnectorRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: CreatePrivateConnectorRequest
  ): Promise<CreatePrivateConnectorResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new PrivateConnectorOrganizationNotFoundError(organizationId.value);
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new PrivateConnectorBuyerCapabilityRequiredError();
    }

    const membership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      membership === null ||
      !canManageOrganizationFinances(membership.role)
    ) {
      throw new PrivateConnectorAuthorizationError();
    }

    const connector = PrivateConnector.create({
      organizationId: organizationId.value,
      environment: request.environment,
      label: request.label,
      mode: request.mode,
      endpointUrl: request.endpointUrl,
      modelMappings: request.modelMappings,
      createdAt: this.clock()
    });

    await this.repository.createPrivateConnector(connector);
    const snapshot = connector.toSnapshot();

    await this.auditLog.record({
      eventName: "private_connector.created",
      occurredAt: snapshot.createdAt,
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        connectorId: snapshot.id,
        environment: snapshot.environment,
        mode: snapshot.mode,
        modelMappingCount: snapshot.modelMappings.length
      }
    });

    return {
      connector: snapshot
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }
}
