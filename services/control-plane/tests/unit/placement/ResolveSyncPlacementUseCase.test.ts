import { describe, expect, it } from "vitest";
import {
  NoEligiblePlacementCandidateError,
  ResolveSyncPlacementUseCase,
  SyncPlacementBuyerCapabilityRequiredError,
  SyncPlacementOrganizationNotFoundError
} from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import type { SyncPlacementRepository } from "../../../src/application/placement/ports/SyncPlacementRepository.js";
import type {
  AuditLog,
  AuditEvent
} from "../../../src/application/identity/ports/AuditLog.js";
import { ProviderInventorySummary } from "../../../src/domain/provider/ProviderInventorySummary.js";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";
import { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import type { PlacementDecisionLog } from "../../../src/domain/placement/PlacementDecisionLog.js";

class InMemorySyncPlacementRepository implements SyncPlacementRepository {
  public readonly logs: PlacementDecisionLog[] = [];

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

  public createPlacementDecisionLog(log: PlacementDecisionLog): Promise<void> {
    this.logs.push(log);
    return Promise.resolve();
  }
}

class InMemoryAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

describe("ResolveSyncPlacementUseCase", () => {
  it("rejects missing buyer organizations", async () => {
    const repository = new InMemorySyncPlacementRepository(null, []);
    const useCase = new ResolveSyncPlacementUseCase(
      repository,
      new InMemoryAuditLog(),
      () => new Date("2026-03-14T10:00:00.000Z")
    );

    await expect(
      useCase.execute({
        organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
        environment: "production",
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      })
    ).rejects.toBeInstanceOf(SyncPlacementOrganizationNotFoundError);
  });

  it("requires buyer capability", async () => {
    const repository = new InMemorySyncPlacementRepository(["provider"], []);
    const useCase = new ResolveSyncPlacementUseCase(
      repository,
      new InMemoryAuditLog(),
      () => new Date("2026-03-14T10:00:00.000Z")
    );

    await expect(
      useCase.execute({
        organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
        environment: "production",
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      })
    ).rejects.toBeInstanceOf(SyncPlacementBuyerCapabilityRequiredError);
  });

  it("selects the lowest-price eligible endpoint and breaks ties by provider node id", async () => {
    const tieWinner = createSummary({
      providerNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
      organizationId: "d8d5e60c-cd17-40fd-b66d-8b05eff10d9c",
      label: "Tie Winner",
      region: "eu-central-1",
      trustTier: "t1_vetted",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: 5.25
    });
    const tieLoser = createSummary({
      providerNodeId: "f1c6255a-8bd1-4380-8579-f90c837e0a20",
      organizationId: "28ca145a-b95c-495d-bd8e-855eaaf70914",
      label: "Tie Loser",
      region: "eu-central-1",
      trustTier: "t1_vetted",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: 5.25
    });
    const expensiveNode = createSummary({
      providerNodeId: "a1c6255a-8bd1-4380-8579-f90c837e0a20",
      organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
      label: "Expensive",
      region: "eu-central-1",
      trustTier: "t1_vetted",
      gpuModel: "NVIDIA A100",
      vramGb: 80,
      priceFloorUsdPerHour: 9.5
    });
    const repository = new InMemorySyncPlacementRepository(
      ["buyer"],
      [expensiveNode, tieLoser, tieWinner]
    );
    const auditLog = new InMemoryAuditLog();
    const useCase = new ResolveSyncPlacementUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-14T10:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
      environment: "production",
      gpuClass: "NVIDIA A100",
      minVramGb: 80,
      region: "eu-central-1",
      minimumTrustTier: "t1_vetted",
      maxPriceUsdPerHour: 10
    });

    expect(response.candidateCount).toBe(3);
    expect(response.selection).toMatchObject({
      providerNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
      endpointUrl: "https://tie-winner.example.com/v1/chat/completions",
      priceFloorUsdPerHour: 5.25
    });
    expect(repository.logs).toHaveLength(1);
    expect(repository.logs[0]?.toSnapshot()).toMatchObject({
      candidateCount: 3,
      selectedProviderNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
      rejectionReason: null
    });
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]).toMatchObject({
      eventName: "placement.sync.decision.logged"
    });
    expect(auditLog.events[0]?.metadata).toMatchObject({
      candidateCount: 3,
      selectedProviderNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
      rejectionReason: null
    });
  });

  it("logs no-match decisions before raising a deterministic error", async () => {
    const repository = new InMemorySyncPlacementRepository(
      ["buyer"],
      [
        createSummary({
          providerNodeId: "a1c6255a-8bd1-4380-8579-f90c837e0a20",
          organizationId: "3486113e-c5ff-4fd7-b3f9-c9c58d06c50e",
          label: "Wrong Region",
          region: "us-east-1",
          trustTier: "t1_vetted",
          gpuModel: "NVIDIA A100",
          vramGb: 80,
          priceFloorUsdPerHour: 5.25
        })
      ]
    );
    const auditLog = new InMemoryAuditLog();
    const useCase = new ResolveSyncPlacementUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-14T10:00:00.000Z")
    );

    await expect(
      useCase.execute({
        organizationId: "761f4cde-7c92-4f3f-9989-e7619f7df0a2",
        environment: "production",
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t1_vetted",
        maxPriceUsdPerHour: 10
      })
    ).rejects.toBeInstanceOf(NoEligiblePlacementCandidateError);

    expect(repository.logs).toHaveLength(1);
    expect(repository.logs[0]?.toSnapshot()).toMatchObject({
      candidateCount: 0,
      selectedProviderNodeId: null,
      rejectionReason: "no_eligible_provider"
    });
    expect(auditLog.events).toHaveLength(1);
    expect(auditLog.events[0]?.metadata).toMatchObject({
      candidateCount: 0,
      selectedProviderNodeId: null,
      rejectionReason: "no_eligible_provider"
    });
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
