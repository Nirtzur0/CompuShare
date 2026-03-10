import { describe, expect, it, vi } from "vitest";
import { GetProviderPricingSimulatorUseCase } from "../../../src/application/dashboard/GetProviderPricingSimulatorUseCase.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";
import { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";
import { ProviderInventorySummary } from "../../../src/domain/provider/ProviderInventorySummary.js";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";

describe("GetProviderPricingSimulatorUseCase", () => {
  it("returns provider pricing simulator baselines with realized net assumptions", async () => {
    const auditLog = {
      record: vi.fn<(...args: unknown[]) => Promise<void>>(() =>
        Promise.resolve()
      )
    };
    const repository = {
      findOrganizationAccountCapabilities: () =>
        Promise.resolve(["provider"] as const),
      findOrganizationMember: () =>
        Promise.resolve(
          OrganizationMember.rehydrate({
            userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
            role: "finance",
            joinedAt: new Date("2026-03-09T11:00:00.000Z")
          })
        ),
      listProviderInventorySummaries: () =>
        Promise.resolve([
          new ProviderInventorySummary(
            ProviderNode.rehydrate({
              id: "8148119e-cf0d-4c8a-b8b2-bb677f796433",
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              machineId: "machine-0001",
              label: "Primary Node",
              runtime: "linux",
              region: "eu-central-1",
              hostname: "node-01.internal",
              trustTier: "t1_vetted",
              healthState: "healthy",
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
              routingProfile: {
                providerNodeId: "8148119e-cf0d-4c8a-b8b2-bb677f796433",
                endpointUrl: "https://provider-1.example.com/v1/chat/completions",
                priceFloorUsdPerHour: 8.5,
                updatedAt: "2026-03-09T11:05:00.000Z",
              },
              enrolledAt: new Date("2026-03-09T11:05:00.000Z"),
            }),
            ProviderBenchmarkReport.record({
              providerNodeId: "8148119e-cf0d-4c8a-b8b2-bb677f796433",
              gpuClass: "NVIDIA A100",
              vramGb: 80,
              throughputTokensPerSecond: 690,
              driverVersion: "550.54.14",
              recordedAt: new Date("2026-03-09T11:06:00.000Z")
            })
          ),
          new ProviderInventorySummary(
            ProviderNode.rehydrate({
              id: "9f373e2f-d218-4118-8798-d43f6d2ddf84",
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
              machineId: "machine-0002",
              label: "No Routing Node",
              runtime: "linux",
              region: "us-east-1",
              hostname: "node-02.internal",
              trustTier: "t2_attested",
              healthState: "degraded",
              inventory: {
                driverVersion: "550.54.14",
                gpus: [
                  {
                    model: "NVIDIA H100",
                    vramGb: 80,
                    count: 8,
                    interconnect: "nvlink"
                  }
                ]
              },
              enrolledAt: new Date("2026-03-09T11:07:00.000Z"),
            }),
            ProviderBenchmarkReport.record({
              providerNodeId: "9f373e2f-d218-4118-8798-d43f6d2ddf84",
              gpuClass: "NVIDIA H100",
              vramGb: 80,
              throughputTokensPerSecond: 900,
              driverVersion: "550.54.14",
              recordedAt: new Date("2026-03-09T11:08:00.000Z")
            })
          )
        ]),
      listProviderNodeUsageTotals: () =>
        Promise.resolve([
          {
            providerNodeId: "8148119e-cf0d-4c8a-b8b2-bb677f796433",
            totalTokens: 41_731_200
          }
        ]),
      getProviderSettlementEconomics: () =>
        Promise.resolve({
          settlementCount: 3,
          providerPayable: UsdAmount.parse("42.00"),
          platformRevenue: UsdAmount.parse("6.00"),
          reserveHoldback: UsdAmount.parse("2.00")
        })
    };
    const useCase = new GetProviderPricingSimulatorUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-10T11:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.simulator).toMatchObject({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorRole: "finance",
      simulatableNodeCount: 1,
      unavailableNodeCount: 1,
      assumptions: {
        usageObservationDays: 7,
        settlementEconomicsDays: 30,
        projectionDays: 30,
        netProjectionStatus: "available",
        settlementCount: 3,
        realizedPlatformFeePercent: 12,
        realizedReserveHoldbackPercent: 4,
        realizedWithdrawablePercent: 80
      }
    });
    expect(response.simulator.nodes).toMatchObject([
      {
        label: "Primary Node",
        simulationStatus: "simulatable",
        currentPriceFloorUsdPerHour: 8.5,
        throughputTokensPerSecond: 690,
        observed7dTotalTokens: 41_731_200,
        observedDailyTokens: 5_961_600,
        observedUtilizationPercent: 10
      },
      {
        label: "No Routing Node",
        simulationStatus: "unavailable",
        unavailableReason: "missing_routing_profile",
        observed7dTotalTokens: 0,
        observedUtilizationPercent: 0
      }
    ]);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "dashboard.provider_pricing_simulator.viewed",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        metadata: {
          simulatableNodeCount: 1,
          unavailableNodeCount: 1,
          settlementCount: 3,
          netProjectionStatus: "available"
        }
      })
    );
  });

  it("marks net projections unavailable when no settlement history exists", async () => {
    const useCase = new GetProviderPricingSimulatorUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["provider"] as const),
        findOrganizationMember: () =>
          Promise.resolve(
            OrganizationMember.rehydrate({
              userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
              role: "finance",
              joinedAt: new Date("2026-03-09T11:00:00.000Z")
            })
          ),
        listProviderInventorySummaries: () => Promise.resolve([]),
        listProviderNodeUsageTotals: () => Promise.resolve([]),
        getProviderSettlementEconomics: () =>
          Promise.resolve({
            settlementCount: 0,
            providerPayable: UsdAmount.zero(),
            platformRevenue: UsdAmount.zero(),
            reserveHoldback: UsdAmount.zero()
          })
      },
      { record: () => Promise.resolve() }
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.simulator.assumptions).toMatchObject({
      netProjectionStatus: "history_required",
      settlementCount: 0,
      realizedPlatformFeePercent: null,
      realizedReserveHoldbackPercent: null,
      realizedWithdrawablePercent: null
    });
  });

  it("rejects members without provider pricing access", async () => {
    const useCase = new GetProviderPricingSimulatorUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["provider"] as const),
        findOrganizationMember: () =>
          Promise.resolve(
            OrganizationMember.rehydrate({
              userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
              role: "developer",
              joinedAt: new Date("2026-03-09T11:00:00.000Z")
            })
          ),
        listProviderInventorySummaries: () => Promise.resolve([]),
        listProviderNodeUsageTotals: () => Promise.resolve([]),
        getProviderSettlementEconomics: () =>
          Promise.resolve({
            settlementCount: 0,
            providerPayable: UsdAmount.zero(),
            platformRevenue: UsdAmount.zero(),
            reserveHoldback: UsdAmount.zero()
          })
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toThrow(
      "Only owner, admin, or finance members may view the provider pricing simulator."
    );
  });

  it("rejects organizations without provider capability", async () => {
    const useCase = new GetProviderPricingSimulatorUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["buyer"] as const),
        findOrganizationMember: () => Promise.resolve(null),
        listProviderInventorySummaries: () => Promise.resolve([]),
        listProviderNodeUsageTotals: () => Promise.resolve([]),
        getProviderSettlementEconomics: () =>
          Promise.resolve({
            settlementCount: 0,
            providerPayable: UsdAmount.zero(),
            platformRevenue: UsdAmount.zero(),
            reserveHoldback: UsdAmount.zero()
          })
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toThrow(
      "Organization must have provider capability before loading the provider pricing simulator."
    );
  });
});
