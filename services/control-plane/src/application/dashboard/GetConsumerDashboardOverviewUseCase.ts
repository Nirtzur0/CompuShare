import type { AuditLog } from "../identity/ports/AuditLog.js";
import { ConsumerDashboardOverview } from "../../domain/dashboard/ConsumerDashboardOverview.js";
import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canViewConsumerDashboard } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import type { AccountCapability } from "../../domain/identity/AccountCapability.js";
import type { ConsumerDashboardRepository } from "./ports/ConsumerDashboardRepository.js";

export interface GetConsumerDashboardOverviewRequest {
  organizationId: string;
  actorUserId: string;
}

export interface GetConsumerDashboardOverviewResponse {
  overview: ReturnType<ConsumerDashboardOverview["toSnapshot"]>;
}

export class ConsumerDashboardOrganizationNotFoundError extends Error {
  public constructor(organizationId: string) {
    super(`Organization "${organizationId}" was not found.`);
    this.name = "ConsumerDashboardOrganizationNotFoundError";
  }
}

export class ConsumerDashboardCapabilityRequiredError extends Error {
  public constructor() {
    super(
      "Organization must have buyer capability before loading the consumer dashboard."
    );
    this.name = "ConsumerDashboardCapabilityRequiredError";
  }
}

export class ConsumerDashboardAuthorizationError extends Error {
  public constructor() {
    super(
      "Only owner, admin, or finance members may view the consumer dashboard shell."
    );
    this.name = "ConsumerDashboardAuthorizationError";
  }
}

export class GetConsumerDashboardOverviewUseCase {
  public constructor(
    private readonly repository: ConsumerDashboardRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: GetConsumerDashboardOverviewRequest
  ): Promise<GetConsumerDashboardOverviewResponse> {
    const viewedAt = this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new ConsumerDashboardOrganizationNotFoundError(
        organizationId.value
      );
    }

    if (!this.hasBuyerCapability(capabilities)) {
      throw new ConsumerDashboardCapabilityRequiredError();
    }

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canViewConsumerDashboard(actorMembership.role)
    ) {
      throw new ConsumerDashboardAuthorizationError();
    }

    const spendSummary =
      await this.repository.getConsumerSpendSummary(organizationId);
    const walletSummary =
      await this.repository.getOrganizationWalletSummary(organizationId);
    const trendWindow = this.resolveTrendWindow(viewedAt);
    const usageTrend = await this.repository.listConsumerDailyUsageTrend({
      organizationId,
      startDateInclusive: trendWindow.startDateInclusive,
      endDateExclusive: trendWindow.endDateExclusive
    });
    const latencyByModel = await this.repository.listConsumerLatencyByModel({
      organizationId,
      startDateInclusive: trendWindow.startDateInclusive,
      endDateExclusive: trendWindow.endDateExclusive
    });
    const overview = ConsumerDashboardOverview.create({
      organizationId: organizationId.value,
      actorRole: actorMembership.role,
      spendSummary: spendSummary.toSnapshot(),
      balances: walletSummary.toSnapshot(),
      usageTrend: this.buildUsageTrend({
        dates: trendWindow.dates,
        usageTrend
      }),
      latencyByModel: [...latencyByModel]
    });
    const snapshot = overview.toSnapshot();

    await this.auditLog.record({
      eventName: "dashboard.consumer_overview.viewed",
      occurredAt: viewedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        lifetimeFundedUsd: snapshot.spendSummary.lifetimeFundedUsd,
        lifetimeSettledSpendUsd: snapshot.spendSummary.lifetimeSettledSpendUsd,
        usageBalanceUsd: snapshot.balances.usageBalanceUsd,
        spendCreditsUsd: snapshot.balances.spendCreditsUsd
      }
    });

    return {
      overview: snapshot
    };
  }

  private hasBuyerCapability(
    capabilities: readonly AccountCapability[]
  ): boolean {
    return capabilities.includes("buyer");
  }

  private resolveTrendWindow(viewedAt: Date): {
    startDateInclusive: Date;
    endDateExclusive: Date;
    dates: string[];
  } {
    const endDateExclusive = this.startOfUtcDay(
      new Date(viewedAt.getTime() + 24 * 60 * 60 * 1000)
    );
    const startDateInclusive = new Date(endDateExclusive);
    startDateInclusive.setUTCDate(startDateInclusive.getUTCDate() - 7);

    return {
      startDateInclusive,
      endDateExclusive,
      dates: this.enumerateUtcDates(startDateInclusive, 7)
    };
  }

  private buildUsageTrend(input: {
    dates: readonly string[];
    usageTrend: Awaited<
      ReturnType<ConsumerDashboardRepository["listConsumerDailyUsageTrend"]>
    >;
  }): {
    date: string;
    requestCount: number;
    totalTokens: number;
  }[] {
    const usageByDate = new Map(
      input.usageTrend.map((entry) => [
        entry.date,
        {
          requestCount: entry.requestCount,
          totalTokens: entry.totalTokens
        }
      ])
    );

    return input.dates.map((date) => ({
      date,
      requestCount: usageByDate.get(date)?.requestCount ?? 0,
      totalTokens: usageByDate.get(date)?.totalTokens ?? 0
    }));
  }

  private enumerateUtcDates(startDateInclusive: Date, days: number): string[] {
    return Array.from({ length: days }, (_, offset) => {
      const nextDate = new Date(startDateInclusive);
      nextDate.setUTCDate(startDateInclusive.getUTCDate() + offset);
      return nextDate.toISOString().slice(0, 10);
    });
  }

  private startOfUtcDay(input: Date): Date {
    return new Date(
      Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate())
    );
  }
}
