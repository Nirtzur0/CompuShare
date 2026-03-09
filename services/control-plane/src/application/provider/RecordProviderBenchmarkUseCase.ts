import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { ProviderBenchmarkReport } from "../../domain/provider/ProviderBenchmarkReport.js";
import { ProviderNodeId } from "../../domain/provider/ProviderNodeId.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import type { ProviderBenchmarkRepository } from "./ports/ProviderBenchmarkRepository.js";

export interface RecordProviderBenchmarkRequest {
  organizationId: string;
  providerNodeId: string;
  gpuClass: string;
  vramGb: number;
  throughputTokensPerSecond: number;
  driverVersion: string;
}

export interface RecordProviderBenchmarkResponse {
  benchmark: {
    id: string;
    providerNodeId: string;
    gpuClass: string;
    vramGb: number;
    throughputTokensPerSecond: number;
    driverVersion: string;
    recordedAt: string;
  };
}

export class ProviderBenchmarkOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ProviderBenchmarkOrganizationNotFoundError";
  }
}

export class ProviderBenchmarkCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have provider capability before recording provider benchmarks."
    );
    this.name = "ProviderBenchmarkCapabilityRequiredError";
  }
}

export class ProviderBenchmarkNodeNotFoundError extends Error {
  public constructor(providerNodeId: string) {
    super(
      `Provider node "${providerNodeId}" was not found for this organization.`
    );
    this.name = "ProviderBenchmarkNodeNotFoundError";
  }
}

export class RecordProviderBenchmarkUseCase {
  public constructor(
    private readonly repository: ProviderBenchmarkRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: RecordProviderBenchmarkRequest
  ): Promise<RecordProviderBenchmarkResponse> {
    const organizationId = OrganizationId.create(request.organizationId);
    const providerNodeId = ProviderNodeId.create(request.providerNodeId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ProviderBenchmarkOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasProviderCapability(capabilities)) {
      throw new ProviderBenchmarkCapabilityRequiredError();
    }

    if (
      !(await this.repository.providerNodeExists(
        organizationId,
        providerNodeId
      ))
    ) {
      throw new ProviderBenchmarkNodeNotFoundError(providerNodeId.value);
    }

    const recordedAt = this.clock();
    const benchmarkReport = ProviderBenchmarkReport.record({
      providerNodeId: providerNodeId.value,
      gpuClass: request.gpuClass,
      vramGb: request.vramGb,
      throughputTokensPerSecond: request.throughputTokensPerSecond,
      driverVersion: request.driverVersion,
      recordedAt
    });

    await this.repository.createProviderBenchmarkReport(benchmarkReport);
    await this.auditLog.record({
      eventName: "provider.node.benchmark.recorded",
      occurredAt: recordedAt.toISOString(),
      actorUserId: organizationId.value,
      organizationId: organizationId.value,
      metadata: {
        providerNodeId: benchmarkReport.providerNodeId.value,
        benchmarkId: benchmarkReport.id.value,
        gpuClass: benchmarkReport.gpuClass.value,
        vramGb: benchmarkReport.vramGb,
        throughputTokensPerSecond:
          benchmarkReport.throughputTokensPerSecond.value,
        driverVersion: benchmarkReport.driverVersion
      }
    });

    return {
      benchmark: benchmarkReport.toSnapshot()
    };
  }

  private hasProviderCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("provider");
  }
}
