import { describe, expect, it, vi } from "vitest";
import { GetProviderDashboardOverviewUseCase } from "../../../src/application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";
import { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";
import { ProviderInventorySummary } from "../../../src/domain/provider/ProviderInventorySummary.js";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";

describe("GetProviderDashboardOverviewUseCase", () => {
  it("returns an aggregated provider dashboard overview for finance-visible members", async () => {
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
            ProviderNode.enroll({
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
              enrolledAt: new Date("2026-03-09T11:05:00.000Z")
            }),
            null
          )
        ]),
      getOrganizationWalletSummary: () =>
        Promise.resolve(
          OrganizationWalletSummary.create({
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            usageBalanceCents: 2500,
            spendCreditsCents: 500,
            pendingEarningsCents: 1125,
            withdrawableCashCents: 775
          })
        ),
      getProviderDisputeSummary: () =>
        Promise.resolve({
          activeDisputeCount: 2,
          activeDisputeHold: UsdAmount.parse("3.50"),
          recentLostDisputeCount: 1
        }),
      listProviderDailyEarningsTrend: () => Promise.resolve([]),
      listProviderDailyTokenUsageTrend: () => Promise.resolve([])
    };
    const useCase = new GetProviderDashboardOverviewUseCase(
      repository,
      auditLog
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
    });

    expect(response.overview).toMatchObject({
      activeNodeCount: 1,
      activeDisputeCount: 2,
      activeDisputeHoldUsd: "3.50",
      recentLostDisputeCount90d: 1,
      actorRole: "finance",
      healthSummary: {
        healthy: 1,
        degraded: 0,
        paused: 0
      },
      trustTierSummary: {
        community: 0,
        vetted: 1,
        attested: 0
      },
      balances: {
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "5.00",
        pendingEarningsUsd: "11.25",
        withdrawableCashUsd: "7.75"
      }
    });
    expect(response.overview.earningsTrend).toEqual(expect.any(Array));
    expect(response.overview.estimatedUtilizationTrend).toEqual(
      expect.any(Array)
    );
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "dashboard.provider_overview.viewed",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        metadata: {
          activeNodeCount: 1,
          activeDisputeCount: 2,
          activeDisputeHoldUsd: "3.50",
          recentLostDisputeCount90d: 1,
          healthyNodeCount: 1,
          degradedNodeCount: 0,
          pausedNodeCount: 0
        }
      })
    );
  });

  it("rejects members without provider dashboard access", async () => {
    const useCase = new GetProviderDashboardOverviewUseCase(
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
        getOrganizationWalletSummary: () =>
          Promise.resolve(
            OrganizationWalletSummary.create({
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
            })
          ),
        getProviderDisputeSummary: () =>
          Promise.resolve({
            activeDisputeCount: 0,
            activeDisputeHold: UsdAmount.zero(),
            recentLostDisputeCount: 0
          }),
        listProviderDailyEarningsTrend: () => Promise.resolve([]),
        listProviderDailyTokenUsageTrend: () => Promise.resolve([])
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toThrow(
      "Only owner, admin, or finance members may view the provider dashboard shell."
    );
  });

  it("rejects missing organizations", async () => {
    const useCase = new GetProviderDashboardOverviewUseCase(
      {
        findOrganizationAccountCapabilities: () => Promise.resolve(null),
        findOrganizationMember: () => Promise.resolve(null),
        listProviderInventorySummaries: () => Promise.resolve([]),
        getOrganizationWalletSummary: () =>
          Promise.resolve(
            OrganizationWalletSummary.create({
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
            })
          ),
        getProviderDisputeSummary: () =>
          Promise.resolve({
            activeDisputeCount: 0,
            activeDisputeHold: UsdAmount.zero(),
            recentLostDisputeCount: 0
          }),
        listProviderDailyEarningsTrend: () => Promise.resolve([]),
        listProviderDailyTokenUsageTrend: () => Promise.resolve([])
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toThrow(
      'Organization "87057cb0-e0ca-4095-9f25-dd8103408b18" was not found.'
    );
  });

  it("rejects organizations without provider capability", async () => {
    const useCase = new GetProviderDashboardOverviewUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["buyer"] as const),
        findOrganizationMember: () => Promise.resolve(null),
        listProviderInventorySummaries: () => Promise.resolve([]),
        getOrganizationWalletSummary: () =>
          Promise.resolve(
            OrganizationWalletSummary.create({
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
            })
          ),
        getProviderDisputeSummary: () =>
          Promise.resolve({
            activeDisputeCount: 0,
            activeDisputeHold: UsdAmount.zero(),
            recentLostDisputeCount: 0
          }),
        listProviderDailyEarningsTrend: () => Promise.resolve([]),
        listProviderDailyTokenUsageTrend: () => Promise.resolve([])
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f"
      })
    ).rejects.toThrow(
      "Organization must have provider capability before loading the provider dashboard."
    );
  });
});
