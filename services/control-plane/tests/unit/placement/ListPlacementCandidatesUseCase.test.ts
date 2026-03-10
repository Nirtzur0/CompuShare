import { describe, expect, it } from "vitest";
import {
  ListPlacementCandidatesUseCase,
  PlacementBuyerCapabilityRequiredError,
  PlacementOrganizationNotFoundError
} from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import type { PlacementCandidateRepository } from "../../../src/application/placement/ports/PlacementCandidateRepository.js";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { ProviderInventorySummary } from "../../../src/domain/provider/ProviderInventorySummary.js";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";
import { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";

class InMemoryPlacementCandidateRepository implements PlacementCandidateRepository {
  public constructor(
    private readonly capabilities: readonly AccountCapability[] | null,
    private readonly summaries: readonly ProviderInventorySummary[]
  ) {}

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.capabilities);
  }

  public listPlacementProviderInventorySummaries(): Promise<
    readonly ProviderInventorySummary[]
  > {
    return Promise.resolve(this.summaries);
  }
}

describe("ListPlacementCandidatesUseCase", () => {
  it("rejects missing buyer organizations", async () => {
    const useCase = new ListPlacementCandidatesUseCase(
      new InMemoryPlacementCandidateRepository(null, [])
    );

    await expect(
      useCase.execute({
        organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      })
    ).rejects.toBeInstanceOf(PlacementOrganizationNotFoundError);
  });

  it("requires buyer capability", async () => {
    const useCase = new ListPlacementCandidatesUseCase(
      new InMemoryPlacementCandidateRepository(["provider"], [])
    );

    await expect(
      useCase.execute({
        organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      })
    ).rejects.toBeInstanceOf(PlacementBuyerCapabilityRequiredError);
  });

  it("filters candidates by routing metadata, gpu capability, region, trust tier, and price cap", async () => {
    const matchingNode = createSummary({
      providerNodeId: "c3c6255a-8bd1-4380-8579-f90c837e0a20",
      organizationId: "28ca145a-b95c-495d-bd8e-855eaaf70914",
      label: "Match",
      region: "eu-central-1",
      trustTier: "t2_attested",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: 6.25
    });
    const wrongRegionNode = createSummary({
      providerNodeId: "7e0dcb95-573d-4e78-bf2f-0be48b5d30e8",
      organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
      label: "Wrong Region",
      region: "us-east-1",
      trustTier: "t2_attested",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: 6.25
    });
    const missingRoutingNode = createSummary({
      providerNodeId: "44f1caed-3cc0-444f-bce2-f64350bbdefb",
      organizationId: "03f9ece7-f242-42ef-a8e2-8b57c7aa19e9",
      label: "Missing Routing",
      region: "eu-central-1",
      trustTier: "t2_attested",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: null
    });
    const useCase = new ListPlacementCandidatesUseCase(
      new InMemoryPlacementCandidateRepository(
        ["buyer"],
        [wrongRegionNode, missingRoutingNode, matchingNode]
      )
    );

    const response = await useCase.execute({
      organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
      gpuClass: " nvidia a100 ",
      minVramGb: 80,
      region: "eu-central-1",
      minimumTrustTier: "t1_vetted",
      maxPriceUsdPerHour: 10
    });

    expect(response.candidates).toEqual([
      expect.objectContaining({
        providerNodeId: "c3c6255a-8bd1-4380-8579-f90c837e0a20",
        providerOrganizationId: "28ca145a-b95c-495d-bd8e-855eaaf70914",
        providerNodeLabel: "Match",
        region: "eu-central-1",
        trustTier: "t2_attested",
        priceFloorUsdPerHour: 6.25,
        matchedGpu: {
          model: "NVIDIA A100",
          vramGb: 80,
          count: 4,
          interconnect: "nvlink"
        }
      })
    ]);
  });

  it("returns deterministic candidate ordering for identical filter inputs", async () => {
    const secondNode = createSummary({
      providerNodeId: "f1c6255a-8bd1-4380-8579-f90c837e0a20",
      organizationId: "28ca145a-b95c-495d-bd8e-855eaaf70914",
      label: "Second",
      region: "eu-central-1",
      trustTier: "t1_vetted",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: 6.25
    });
    const firstNode = createSummary({
      providerNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
      organizationId: "d8d5e60c-cd17-40fd-b66d-8b05eff10d9c",
      label: "First",
      region: "eu-central-1",
      trustTier: "t1_vetted",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: 8.75
    });
    const useCase = new ListPlacementCandidatesUseCase(
      new InMemoryPlacementCandidateRepository(
        ["buyer"],
        [secondNode, firstNode]
      )
    );

    const response = await useCase.execute({
      organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
      gpuClass: "NVIDIA A100",
      minVramGb: 80,
      region: "eu-central-1",
      minimumTrustTier: "t1_vetted",
      maxPriceUsdPerHour: 20
    });

    expect(
      response.candidates.map((candidate) => candidate.providerNodeId)
    ).toEqual([
      "f1c6255a-8bd1-4380-8579-f90c837e0a20",
      "01c6255a-8bd1-4380-8579-f90c837e0a20"
    ]);
  });

  it("validates gpu class input", async () => {
    const useCase = new ListPlacementCandidatesUseCase(
      new InMemoryPlacementCandidateRepository(["buyer"], [])
    );

    await expect(
      useCase.execute({
        organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
        gpuClass: " ",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      })
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it("validates minimum vram input", async () => {
    const useCase = new ListPlacementCandidatesUseCase(
      new InMemoryPlacementCandidateRepository(["buyer"], [])
    );

    await expect(
      useCase.execute({
        organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
        gpuClass: "NVIDIA A100",
        minVramGb: 0,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      })
    ).rejects.toBeInstanceOf(DomainValidationError);
  });
});

function createSummary(input: {
  providerNodeId: string;
  organizationId: string;
  label: string;
  region: string;
  trustTier: "t0_community" | "t1_vetted" | "t2_attested";
  gpuModel: string;
  vramGb: number;
  priceFloorUsdPerHour: number | null;
}): ProviderInventorySummary {
  const node = ProviderNode.rehydrate({
    id: input.providerNodeId,
    organizationId: input.organizationId,
    machineId: `${input.providerNodeId}-machine`,
    label: input.label,
    runtime: "linux",
    region: input.region,
    hostname: `${input.label.toLowerCase().replaceAll(" ", "-")}.internal`,
    trustTier: input.trustTier,
    healthState: "healthy",
    inventory: {
      driverVersion: "550.54.14",
      gpus: [
        {
          model: input.gpuModel,
          vramGb: input.vramGb,
          count: 4,
          interconnect: "nvlink"
        }
      ]
    },
    routingProfile:
      input.priceFloorUsdPerHour === null
        ? null
        : {
            providerNodeId: input.providerNodeId,
            endpointUrl: `https://${input.label.toLowerCase().replaceAll(" ", "-")}.example.com/v1/chat/completions`,
            priceFloorUsdPerHour: input.priceFloorUsdPerHour,
            updatedAt: "2026-03-09T19:15:00.000Z"
          },
    enrolledAt: new Date("2026-03-09T18:10:00.000Z")
  });

  return new ProviderInventorySummary(
    node,
    ProviderBenchmarkReport.record({
      providerNodeId: input.providerNodeId,
      gpuClass: input.gpuModel,
      vramGb: input.vramGb,
      throughputTokensPerSecond: 742.5,
      driverVersion: "550.54.14",
      recordedAt: new Date("2026-03-09T19:00:00.000Z")
    })
  );
}
