import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { UserId } from "../../domain/identity/UserId.js";
import {
  canManageOrganizationFinances,
  type OrganizationRole
} from "../../domain/identity/OrganizationRole.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import type { PrivateConnectorRepository } from "./ports/PrivateConnectorRepository.js";
import {
  PrivateConnectorAuthorizationError,
  PrivateConnectorBuyerCapabilityRequiredError,
  PrivateConnectorOrganizationNotFoundError
} from "./CreatePrivateConnectorUseCase.js";

export interface ListPrivateConnectorsRequest {
  organizationId: string;
  actorUserId: string;
  environment?: "development" | "staging" | "production";
}

export interface ListPrivateConnectorsResponse {
  actorRole: OrganizationRole;
  connectors: {
    connector: ReturnType<
      Awaited<
        ReturnType<PrivateConnectorRepository["listPrivateConnectors"]>
      >[number]["toSnapshot"]
    >;
    status: "pending" | "ready" | "stale" | "disabled";
  }[];
}

export class ListPrivateConnectorsUseCase {
  public constructor(
    private readonly repository: PrivateConnectorRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly staleAfterMs = 2 * 60 * 1000
  ) {}

  public async execute(
    request: ListPrivateConnectorsRequest
  ): Promise<ListPrivateConnectorsResponse> {
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

    const connectors = await this.repository.listPrivateConnectors(
      organizationId,
      request.environment
    );
    const now = this.clock();

    return {
      actorRole: membership.role,
      connectors: connectors.map((connector) => ({
        connector: connector.toSnapshot(),
        status: connector.resolveStatus(now, this.staleAfterMs)
      }))
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }
}
