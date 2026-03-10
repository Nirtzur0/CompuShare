import type { AuditLog } from "../identity/ports/AuditLog.js";
import { PrivateConnectorDashboard } from "../../domain/dashboard/PrivateConnectorDashboard.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { canViewConsumerDashboard } from "../../domain/identity/OrganizationRole.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import type { PrivateConnectorDashboardRepository } from "./ports/PrivateConnectorDashboardRepository.js";

export class PrivateConnectorDashboardOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "PrivateConnectorDashboardOrganizationNotFoundError";
  }
}

export class PrivateConnectorDashboardCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have buyer capability before loading private connector dashboard data."
    );
    this.name = "PrivateConnectorDashboardCapabilityRequiredError";
  }
}

export class PrivateConnectorDashboardAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may view private connector dashboard data."
    );
    this.name = "PrivateConnectorDashboardAuthorizationError";
  }
}

export interface GetPrivateConnectorDashboardRequest {
  organizationId: string;
  actorUserId: string;
}

export interface GetPrivateConnectorDashboardResponse {
  dashboard: ReturnType<PrivateConnectorDashboard["toSnapshot"]>;
}

export class GetPrivateConnectorDashboardUseCase {
  public constructor(
    private readonly repository: PrivateConnectorDashboardRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date(),
    private readonly staleAfterMs = 2 * 60 * 1000
  ) {}

  public async execute(
    request: GetPrivateConnectorDashboardRequest
  ): Promise<GetPrivateConnectorDashboardResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new PrivateConnectorDashboardOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new PrivateConnectorDashboardCapabilityRequiredError();
    }

    const membership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (membership === null || !canViewConsumerDashboard(membership.role)) {
      throw new PrivateConnectorDashboardAuthorizationError();
    }

    const now = this.clock();
    const connectors = await this.repository.listPrivateConnectors(organizationId);
    const dashboard = PrivateConnectorDashboard.create({
      organizationId: organizationId.value,
      actorRole: membership.role,
      connectors: connectors.map((connector) => ({
        connector,
        status: connector.resolveStatus(now, this.staleAfterMs)
      }))
    });
    const snapshot = dashboard.toSnapshot();

    await this.auditLog.record({
      eventName: "dashboard.private_connectors.viewed",
      occurredAt: now.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        connectorCount: snapshot.connectors.length,
        readyConnectorCount: snapshot.readyConnectorCount,
        staleConnectorCount: snapshot.staleConnectorCount
      }
    });

    return {
      dashboard: snapshot
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }
}
