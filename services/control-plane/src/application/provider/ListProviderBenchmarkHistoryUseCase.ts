import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import type { ProviderBenchmarkReportSnapshot } from "../../domain/provider/ProviderBenchmarkReport.js";
import { ProviderNodeId } from "../../domain/provider/ProviderNodeId.js";
import type { ProviderBenchmarkRepository } from "./ports/ProviderBenchmarkRepository.js";

export interface ListProviderBenchmarkHistoryRequest {
  organizationId: string;
  providerNodeId: string;
}

export interface ListProviderBenchmarkHistoryResponse {
  benchmarks: ProviderBenchmarkReportSnapshot[];
}

export class ProviderBenchmarkHistoryOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderBenchmarkHistoryOrganizationNotFoundError";
  }
}

export class ProviderBenchmarkHistoryCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before listing benchmark history."
    );
    this.name = "ProviderBenchmarkHistoryCapabilityRequiredError";
  }
}

export class ProviderBenchmarkHistoryNodeNotFoundError extends Error {
  public constructor(providerNodeId: string) {
    super(
      `Provider node "${providerNodeId}" was not found for this organization.`
    );
    this.name = "ProviderBenchmarkHistoryNodeNotFoundError";
  }
}

export class ListProviderBenchmarkHistoryUseCase {
  public constructor(
    private readonly repository: ProviderBenchmarkRepository
  ) {}

  public async execute(
    request: ListProviderBenchmarkHistoryRequest
  ): Promise<ListProviderBenchmarkHistoryResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const providerNodeId = ProviderNodeId.create(request.providerNodeId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderBenchmarkHistoryOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderBenchmarkHistoryCapabilityRequiredError();
    }

    if (
      !(await this.repository.providerNodeExists(
        organizationId,
        providerNodeId
      ))
    ) {
      throw new ProviderBenchmarkHistoryNodeNotFoundError(providerNodeId.value);
    }

    const benchmarks = await this.repository.listProviderBenchmarkReports(
      organizationId,
      providerNodeId
    );

    return {
      benchmarks: benchmarks.map((benchmark) => benchmark.toSnapshot())
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
