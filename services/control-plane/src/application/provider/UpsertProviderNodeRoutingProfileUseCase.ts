import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { ProviderNodeRoutingProfile } from "../../domain/provider/ProviderNodeRoutingProfile.js";
import { ProviderNodeId } from "../../domain/provider/ProviderNodeId.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderRoutingProfileRepository } from "./ports/ProviderRoutingProfileRepository.js";

export interface UpsertProviderNodeRoutingProfileRequest {
  organizationId: string;
  providerNodeId: string;
  endpointUrl: string;
  priceFloorUsdPerHour: number;
}

export interface UpsertProviderNodeRoutingProfileResponse {
  routingProfile: {
    providerNodeId: string;
    endpointUrl: string;
    priceFloorUsdPerHour: number;
    updatedAt: string;
  };
}

export class ProviderRoutingProfileOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderRoutingProfileOrganizationNotFoundError";
  }
}

export class ProviderRoutingProfileCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before configuring provider node routing metadata."
    );
    this.name = "ProviderRoutingProfileCapabilityRequiredError";
  }
}

export class ProviderRoutingProfileNodeNotFoundError extends Error {
  public constructor(providerNodeId: string) {
    super(
      `Provider node "${providerNodeId}" was not found for this organization.`
    );
    this.name = "ProviderRoutingProfileNodeNotFoundError";
  }
}

export class UpsertProviderNodeRoutingProfileUseCase {
  public constructor(
    private readonly repository: ProviderRoutingProfileRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: UpsertProviderNodeRoutingProfileRequest
  ): Promise<UpsertProviderNodeRoutingProfileResponse> {
    const updatedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const providerNodeId = ProviderNodeId.create(request.providerNodeId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderRoutingProfileOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderRoutingProfileCapabilityRequiredError();
    }

    if (
      !(await this.repository.providerNodeExists(
        organizationId,
        providerNodeId
      ))
    ) {
      throw new ProviderRoutingProfileNodeNotFoundError(providerNodeId.value);
    }

    const routingProfile = ProviderNodeRoutingProfile.configure({
      providerNodeId: providerNodeId.value,
      endpointUrl: request.endpointUrl,
      priceFloorUsdPerHour: request.priceFloorUsdPerHour,
      updatedAt
    });

    await this.repository.upsertProviderNodeRoutingProfile(routingProfile);
    await this.auditLog.record({
      eventName: "provider.node.routing_profile.upserted",
      occurredAt: updatedAt.toISOString(),
      actorUserId: organizationId.value,
      organizationId: organizationId.value,
      metadata: {
        providerNodeId: providerNodeId.value,
        endpointUrl: routingProfile.endpointUrl.value,
        priceFloorUsdPerHour: routingProfile.priceFloorUsdPerHour.value
      }
    });

    return {
      routingProfile: routingProfile.toSnapshot()
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
