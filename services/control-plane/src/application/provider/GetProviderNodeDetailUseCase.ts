import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { ProviderInventorySummarySnapshot } from "../../domain/provider/ProviderInventorySummary.js";
import { ProviderNodeId } from "../../domain/provider/ProviderNodeId.js";
import type { ProviderInventoryRepository } from "./ports/ProviderInventoryRepository.js";

export interface GetProviderNodeDetailRequest {
  organizationId: string;
  providerNodeId: string;
}

export type GetProviderNodeDetailResponse = ProviderInventorySummarySnapshot;

export class ProviderNodeDetailOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderNodeDetailOrganizationNotFoundError";
  }
}

export class ProviderNodeDetailCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before reading provider node detail."
    );
    this.name = "ProviderNodeDetailCapabilityRequiredError";
  }
}

export class ProviderNodeDetailNotFoundError extends Error {
  public constructor(providerNodeId: string) {
    super(
      `Provider node "${providerNodeId}" was not found for this organization.`
    );
    this.name = "ProviderNodeDetailNotFoundError";
  }
}

export class GetProviderNodeDetailUseCase {
  public constructor(
    private readonly repository: ProviderInventoryRepository
  ) {}

  public async execute(
    request: GetProviderNodeDetailRequest
  ): Promise<GetProviderNodeDetailResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const providerNodeId = ProviderNodeId.create(request.providerNodeId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderNodeDetailOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderNodeDetailCapabilityRequiredError();
    }

    const summary = await this.repository.findProviderInventorySummary(
      organizationId,
      providerNodeId
    );

    if (summary === null) {
      throw new ProviderNodeDetailNotFoundError(providerNodeId.value);
    }

    return summary.toSnapshot();
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
