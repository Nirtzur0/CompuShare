import {
  ConsumerDashboardOverview,
  type ConsumerDashboardOverviewSnapshot,
} from "../../domain/consumer/ConsumerDashboardOverview.js";
import {
  PrivateConnectorDashboard,
  type PrivateConnectorDashboardSnapshot,
} from "../../domain/consumer/PrivateConnectorDashboard.js";
import {
  ProviderDashboardOverview,
  type ProviderDashboardOverviewSnapshot,
} from "../../domain/provider/ProviderDashboardOverview.js";
import {
  ProviderPricingSimulator,
  type ProviderPricingSimulatorSnapshot,
} from "../../domain/provider/ProviderPricingSimulator.js";

interface ProviderDashboardOverviewEnvelope {
  overview: ProviderDashboardOverviewSnapshot;
}

interface ProviderPricingSimulatorEnvelope {
  simulator: ProviderPricingSimulatorSnapshot;
}

interface PrivateConnectorDashboardEnvelope {
  dashboard: PrivateConnectorDashboardSnapshot;
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

  public async getPrivateConnectorDashboard(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<PrivateConnectorDashboard> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/private-connectors`,
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
        `Private connector dashboard request failed with status ${String(response.status)}.`,
      );
    }

    const payload =
      (await response.json()) as PrivateConnectorDashboardEnvelope;

    return PrivateConnectorDashboard.create(payload.dashboard);
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

  public async getProviderPricingSimulator(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ProviderPricingSimulator> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/provider-pricing-simulator`,
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
        `Provider pricing simulator request failed with status ${String(response.status)}.`,
      );
    }

    const payload =
      (await response.json()) as ProviderPricingSimulatorEnvelope;

    return ProviderPricingSimulator.create(payload.simulator);
  }

  public async createPrivateConnector(input: {
    organizationId: string;
    actorUserId: string;
    environment: "development" | "staging" | "production";
    label: string;
    mode: "cluster" | "byok_api";
    endpointUrl: string;
    modelMappings: {
      requestModelAlias: string;
      upstreamModelId: string;
    }[];
  }): Promise<void> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/private-connectors`,
      this.baseUrl,
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        actorUserId: input.actorUserId,
        environment: input.environment,
        label: input.label,
        mode: input.mode,
        endpointUrl: input.endpointUrl,
        modelMappings: input.modelMappings,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Private connector create request failed with status ${String(response.status)}.`,
      );
    }
  }
}
