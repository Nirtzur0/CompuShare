import { describe, expect, it } from "vitest";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import {
  ProviderBenchmarkCapabilityRequiredError,
  ProviderBenchmarkNodeNotFoundError,
  ProviderBenchmarkOrganizationNotFoundError,
  RecordProviderBenchmarkUseCase,
  type RecordProviderBenchmarkRequest
} from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import type { ProviderBenchmarkRepository } from "../../../src/application/provider/ports/ProviderBenchmarkRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import type { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";
import type { ProviderNodeId } from "../../../src/domain/provider/ProviderNodeId.js";

class RecordingAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

class InMemoryProviderBenchmarkRepository implements ProviderBenchmarkRepository {
  public accountCapabilities: readonly AccountCapability[] | null = [
    "provider"
  ];
  public hasProviderNode = true;
  public benchmarkReport: ProviderBenchmarkReport | null = null;

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.accountCapabilities);
  }

  public providerNodeExists(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<boolean> {
    void organizationId;
    void providerNodeId;
    return Promise.resolve(this.hasProviderNode);
  }

  public listProviderBenchmarkReports(): Promise<
    readonly ProviderBenchmarkReport[]
  > {
    return Promise.resolve([]);
  }

  public createProviderBenchmarkReport(
    benchmarkReport: ProviderBenchmarkReport
  ): Promise<void> {
    this.benchmarkReport = benchmarkReport;
    return Promise.resolve();
  }
}

describe("RecordProviderBenchmarkUseCase", () => {
  const request: RecordProviderBenchmarkRequest = {
    organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
    providerNodeId: "8f2ab4ae-4ce4-4b93-b759-2019417c5bb4",
    gpuClass: "NVIDIA A100",
    vramGb: 80,
    throughputTokensPerSecond: 742.5,
    driverVersion: "550.54.14"
  };

  it("records a provider benchmark and emits an audit event", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    const auditLog = new RecordingAuditLog();
    const useCase = new RecordProviderBenchmarkUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-09T19:00:00.000Z")
    );

    const response = await useCase.execute(request);

    expect(response.benchmark).toMatchObject({
      providerNodeId: request.providerNodeId,
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: 742.5,
      driverVersion: "550.54.14",
      recordedAt: "2026-03-09T19:00:00.000Z"
    });
    expect(repository.benchmarkReport).not.toBeNull();
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]).toMatchObject({
      eventName: "provider.node.benchmark.recorded",
      organizationId: request.organizationId,
      metadata: {
        providerNodeId: request.providerNodeId,
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });
  });

  it("rejects unknown organizations", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    repository.accountCapabilities = null;
    const useCase = new RecordProviderBenchmarkUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      ProviderBenchmarkOrganizationNotFoundError
    );
  });

  it("requires provider capability", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    repository.accountCapabilities = ["buyer"];
    const useCase = new RecordProviderBenchmarkUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      ProviderBenchmarkCapabilityRequiredError
    );
  });

  it("rejects benchmark submissions for unknown provider nodes", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    repository.hasProviderNode = false;
    const useCase = new RecordProviderBenchmarkUseCase(
      repository,
      new RecordingAuditLog()
    );

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(
      ProviderBenchmarkNodeNotFoundError
    );
  });
});
