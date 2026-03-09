import { describe, expect, it } from "vitest";
import {
  ListProviderBenchmarkHistoryUseCase,
  ProviderBenchmarkHistoryCapabilityRequiredError,
  ProviderBenchmarkHistoryNodeNotFoundError,
  ProviderBenchmarkHistoryOrganizationNotFoundError
} from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import type { ProviderBenchmarkRepository } from "../../../src/application/provider/ports/ProviderBenchmarkRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";
import type { ProviderNodeId } from "../../../src/domain/provider/ProviderNodeId.js";

class InMemoryProviderBenchmarkRepository implements ProviderBenchmarkRepository {
  public accountCapabilities: readonly AccountCapability[] | null = [
    "provider"
  ];
  public providerNodeExistsResult = true;
  public benchmarks: ProviderBenchmarkReport[] = [
    ProviderBenchmarkReport.record({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: 742.5,
      driverVersion: "550.54.14",
      recordedAt: new Date("2026-03-09T19:00:00.000Z")
    }),
    ProviderBenchmarkReport.record({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: 701.2,
      driverVersion: "550.54.14",
      recordedAt: new Date("2026-03-09T18:55:00.000Z")
    })
  ];

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
    return Promise.resolve(this.providerNodeExistsResult);
  }

  public listProviderBenchmarkReports(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<readonly ProviderBenchmarkReport[]> {
    void organizationId;
    void providerNodeId;
    return Promise.resolve(this.benchmarks);
  }

  public createProviderBenchmarkReport(): Promise<void> {
    return Promise.reject(new Error("unused create path"));
  }
}

describe("ListProviderBenchmarkHistoryUseCase", () => {
  it("lists benchmark history newest first for a provider node", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    const useCase = new ListProviderBenchmarkHistoryUseCase(repository);

    const response = await useCase.execute({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
    });

    expect(response.benchmarks).toHaveLength(2);
    expect(response.benchmarks[0]).toMatchObject({
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      throughputTokensPerSecond: 742.5
    });
    expect(response.benchmarks[1]).toMatchObject({
      throughputTokensPerSecond: 701.2
    });
  });

  it("rejects unknown organizations", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    repository.accountCapabilities = null;
    const useCase = new ListProviderBenchmarkHistoryUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderBenchmarkHistoryOrganizationNotFoundError);
  });

  it("requires provider capability", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    repository.accountCapabilities = ["buyer"];
    const useCase = new ListProviderBenchmarkHistoryUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderBenchmarkHistoryCapabilityRequiredError);
  });

  it("rejects unknown provider nodes", async () => {
    const repository = new InMemoryProviderBenchmarkRepository();
    repository.providerNodeExistsResult = false;
    const useCase = new ListProviderBenchmarkHistoryUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderBenchmarkHistoryNodeNotFoundError);
  });
});
