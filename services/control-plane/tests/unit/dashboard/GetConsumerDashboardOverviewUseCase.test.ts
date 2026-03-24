import { describe, expect, it, vi } from "vitest";
import {
  ConsumerDashboardAuthorizationError,
  ConsumerDashboardCapabilityRequiredError,
  ConsumerDashboardOrganizationNotFoundError,
  GetConsumerDashboardOverviewUseCase
} from "../../../src/application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { ConsumerSpendSummary } from "../../../src/domain/dashboard/ConsumerSpendSummary.js";
import type { GatewayUsageQuotaSnapshot } from "../../../src/application/gateway/ports/GatewayUsageAdmissionRepository.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";

function createGatewayQuotaSnapshot(
  overrides: Partial<GatewayUsageQuotaSnapshot> = {}
): GatewayUsageQuotaSnapshot {
  return {
    environment: "development",
    fixedDayStartedAt: "2026-03-18T00:00:00.000Z",
    fixedDayResetsAt: "2026-03-19T00:00:00.000Z",
    fixedDayTokenLimit: 2_000_000,
    fixedDayUsedTokens: 0,
    fixedDayRemainingTokens: 2_000_000,
    syncRequestsPerMinutePerApiKey: 60,
    maxBatchItemsPerJob: 500,
    maxActiveBatchesPerOrganizationEnvironment: 5,
    ...overrides
  };
}

describe("GetConsumerDashboardOverviewUseCase", () => {
  it("returns an aggregated consumer dashboard overview for finance-visible members", async () => {
    const auditLog = {
      record: vi.fn<(...args: unknown[]) => Promise<void>>(() =>
        Promise.resolve()
      )
    };
    const repository = {
      findOrganizationAccountCapabilities: () =>
        Promise.resolve(["buyer"] as const),
      findOrganizationMember: () =>
        Promise.resolve(
          OrganizationMember.rehydrate({
            userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
            role: "finance",
            joinedAt: new Date("2026-03-09T11:00:00.000Z")
          })
        ),
      getConsumerSpendSummary: () =>
        Promise.resolve(
          ConsumerSpendSummary.create({
            lifetimeFundedCents: 10000,
            lifetimeSettledSpendCents: 5000
          })
        ),
      getOrganizationWalletSummary: () =>
        Promise.resolve(
          OrganizationWalletSummary.create({
            organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
            usageBalanceCents: 5000,
            spendCreditsCents: 250,
            pendingEarningsCents: 0,
            withdrawableCashCents: 0
          })
        ),
      listConsumerDailyUsageTrend: () => Promise.resolve([]),
      listConsumerLatencyByModel: () => Promise.resolve([]),
      getGatewayUsageQuotaSnapshot: () =>
        Promise.resolve(
          createGatewayQuotaSnapshot({
            fixedDayUsedTokens: 512,
            fixedDayRemainingTokens: 1_999_488
          })
        )
    };
    const useCase = new GetConsumerDashboardOverviewUseCase(
      repository,
      auditLog
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      environment: "development"
    });

    expect(response.overview).toMatchObject({
      actorRole: "finance",
      spendSummary: {
        lifetimeFundedUsd: "100.00",
        lifetimeSettledSpendUsd: "50.00"
      },
      balances: {
        usageBalanceUsd: "50.00",
        spendCreditsUsd: "2.50"
      },
      gatewayQuotaStatus: {
          environment: "development",
        fixedDayUsedTokens: 512
      }
    });
    expect(response.overview.usageTrend).toEqual(expect.any(Array));
    expect(response.overview.latencyByModel).toEqual(expect.any(Array));
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "dashboard.consumer_overview.viewed",
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        metadata: {
          lifetimeFundedUsd: "100.00",
          lifetimeSettledSpendUsd: "50.00",
          usageBalanceUsd: "50.00",
          spendCreditsUsd: "2.50",
          gatewayQuotaEnvironment: "development",
          gatewayQuotaRemainingTokens: 1_999_488
        }
      })
    );
  });

  it("rejects members without consumer dashboard access", async () => {
    const useCase = new GetConsumerDashboardOverviewUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["buyer"] as const),
        findOrganizationMember: () =>
          Promise.resolve(
            OrganizationMember.rehydrate({
              userId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
              role: "developer",
              joinedAt: new Date("2026-03-09T11:00:00.000Z")
            })
          ),
        getConsumerSpendSummary: () =>
          Promise.resolve(ConsumerSpendSummary.create({})),
        getOrganizationWalletSummary: () =>
          Promise.resolve(
            OrganizationWalletSummary.create({
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
            })
          ),
        listConsumerDailyUsageTrend: () => Promise.resolve([]),
        listConsumerLatencyByModel: () => Promise.resolve([]),
        getGatewayUsageQuotaSnapshot: () =>
          Promise.resolve(createGatewayQuotaSnapshot())
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development"
      })
    ).rejects.toBeInstanceOf(ConsumerDashboardAuthorizationError);
  });

  it("rejects organizations without buyer capability", async () => {
    const useCase = new GetConsumerDashboardOverviewUseCase(
      {
        findOrganizationAccountCapabilities: () =>
          Promise.resolve(["provider"] as const),
        findOrganizationMember: () => Promise.resolve(null),
        getConsumerSpendSummary: () =>
          Promise.resolve(ConsumerSpendSummary.create({})),
        getOrganizationWalletSummary: () =>
          Promise.resolve(
            OrganizationWalletSummary.create({
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
            })
          ),
        listConsumerDailyUsageTrend: () => Promise.resolve([]),
        listConsumerLatencyByModel: () => Promise.resolve([]),
        getGatewayUsageQuotaSnapshot: () =>
          Promise.resolve(createGatewayQuotaSnapshot())
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development"
      })
    ).rejects.toBeInstanceOf(ConsumerDashboardCapabilityRequiredError);
  });

  it("rejects unknown organizations", async () => {
    const useCase = new GetConsumerDashboardOverviewUseCase(
      {
        findOrganizationAccountCapabilities: () => Promise.resolve(null),
        findOrganizationMember: () => Promise.resolve(null),
        getConsumerSpendSummary: () =>
          Promise.resolve(ConsumerSpendSummary.create({})),
        getOrganizationWalletSummary: () =>
          Promise.resolve(
            OrganizationWalletSummary.create({
              organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18"
            })
          ),
        listConsumerDailyUsageTrend: () => Promise.resolve([]),
        listConsumerLatencyByModel: () => Promise.resolve([]),
        getGatewayUsageQuotaSnapshot: () =>
          Promise.resolve(createGatewayQuotaSnapshot())
      },
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        environment: "development"
      })
    ).rejects.toBeInstanceOf(ConsumerDashboardOrganizationNotFoundError);
  });
});
