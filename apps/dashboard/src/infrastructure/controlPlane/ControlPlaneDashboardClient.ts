import {
  ConsumerDashboardOverview,
  type ConsumerDashboardOverviewSnapshot,
} from "../../domain/consumer/ConsumerDashboardOverview.js";
import {
  ProviderDashboardOverview,
  type ProviderDashboardOverviewSnapshot,
} from "../../domain/provider/ProviderDashboardOverview.js";

interface ProviderDashboardOverviewEnvelope {
  overview: ProviderDashboardOverviewSnapshot;
}

interface ConsumerDashboardOverviewEnvelope {
  overview: ConsumerDashboardOverviewSnapshot;
}

export class ControlPlaneDashboardClient {
  public constructor(private readonly baseUrl: string) {}

  public async getConsumerDashboardOverview(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ConsumerDashboardOverview> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/consumer-overview`,
      this.baseUrl,
    );
    url.searchParams.set("actorUserId", input.actorUserId);

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Consumer dashboard request failed with status ${String(response.status)}.`,
      );
    }

    const payload =
      (await response.json()) as ConsumerDashboardOverviewEnvelope;

    return ConsumerDashboardOverview.create(payload.overview);
  }

  public async getProviderDashboardOverview(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ProviderDashboardOverview> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/provider-overview`,
      this.baseUrl,
    );
    url.searchParams.set("actorUserId", input.actorUserId);

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Provider dashboard request failed with status ${String(response.status)}.`,
      );
    }

    const payload =
      (await response.json()) as ProviderDashboardOverviewEnvelope;

    return ProviderDashboardOverview.create(payload.overview);
  }
}
