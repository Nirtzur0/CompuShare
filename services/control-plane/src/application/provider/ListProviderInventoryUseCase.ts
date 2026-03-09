import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { ProviderInventorySummarySnapshot } from "../../domain/provider/ProviderInventorySummary.js";
import type { ProviderInventoryRepository } from "./ports/ProviderInventoryRepository.js";

export interface ListProviderInventoryRequest {
  organizationId: string;
}

export interface ListProviderInventoryResponse {
  nodes: ProviderInventorySummarySnapshot[];
}

export class ProviderInventoryOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderInventoryOrganizationNotFoundError";
  }
}

export class ProviderInventoryCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before listing provider inventory."
    );
    this.name = "ProviderInventoryCapabilityRequiredError";
  }
}

export class ListProviderInventoryUseCase {
  public constructor(
    private readonly repository: ProviderInventoryRepository
  ) {}

  public async execute(
    request: ListProviderInventoryRequest
  ): Promise<ListProviderInventoryResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderInventoryOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderInventoryCapabilityRequiredError();
    }

    const summaries =
      await this.repository.listProviderInventorySummaries(organizationId);

    return {
      nodes: summaries.map((summary) => summary.toSnapshot())
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
