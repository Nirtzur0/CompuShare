import { describe, expect, it } from "vitest";
import {
  GetProviderNodeDetailUseCase,
  ProviderNodeDetailCapabilityRequiredError,
  ProviderNodeDetailNotFoundError,
  ProviderNodeDetailOrganizationNotFoundError
} from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import type { ProviderInventoryRepository } from "../../../src/application/provider/ports/ProviderInventoryRepository.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";
import { ProviderInventorySummary } from "../../../src/domain/provider/ProviderInventorySummary.js";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";
import type { ProviderNodeId } from "../../../src/domain/provider/ProviderNodeId.js";

class InMemoryProviderInventoryRepository implements ProviderInventoryRepository {
  public accountCapabilities: readonly AccountCapability[] | null = [
    "provider"
  ];
  public summary: ProviderInventorySummary | null =
    new ProviderInventorySummary(
      ProviderNode.enroll({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        machineId: "node-machine-0001",
        label: "Primary Vetted Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "node-01.internal",
        inventory: {
          driverVersion: "550.54.14",
          gpus: [
            {
              model: "NVIDIA A100",
              vramGb: 80,
              count: 4,
              interconnect: "nvlink"
            }
          ]
        },
        enrolledAt: new Date("2026-03-09T18:10:00.000Z")
      }),
      ProviderBenchmarkReport.record({
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14",
        recordedAt: new Date("2026-03-09T19:00:00.000Z")
      })
    );

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.accountCapabilities);
  }

  public findProviderInventorySummary(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<ProviderInventorySummary | null> {
    void organizationId;
    void providerNodeId;
    return Promise.resolve(this.summary);
  }

  public listProviderInventorySummaries(
    organizationId: OrganizationId
  ): Promise<readonly ProviderInventorySummary[]> {
    void organizationId;
    return Promise.resolve(this.summary === null ? [] : [this.summary]);
  }
}

describe("GetProviderNodeDetailUseCase", () => {
  it("returns one provider node detail snapshot", async () => {
    const repository = new InMemoryProviderInventoryRepository();
    const useCase = new GetProviderNodeDetailUseCase(repository);

    const response = await useCase.execute({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
    });

    expect(response).toMatchObject({
      node: {
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        machineId: "node-machine-0001",
        trustTier: "t1_vetted",
        healthState: "healthy"
      },
      latestBenchmark: {
        gpuClass: "NVIDIA A100",
        throughputTokensPerSecond: 742.5
      }
    });
  });

  it("rejects unknown organizations", async () => {
    const repository = new InMemoryProviderInventoryRepository();
    repository.accountCapabilities = null;
    const useCase = new GetProviderNodeDetailUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderNodeDetailOrganizationNotFoundError);
  });

  it("requires provider capability", async () => {
    const repository = new InMemoryProviderInventoryRepository();
    repository.accountCapabilities = ["buyer"];
    const useCase = new GetProviderNodeDetailUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderNodeDetailCapabilityRequiredError);
  });

  it("rejects unknown provider nodes", async () => {
    const repository = new InMemoryProviderInventoryRepository();
    repository.summary = null;
    const useCase = new GetProviderNodeDetailUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderNodeDetailNotFoundError);
  });
});
