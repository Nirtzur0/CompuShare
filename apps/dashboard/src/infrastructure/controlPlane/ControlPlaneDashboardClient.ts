import {
  ComplianceOverview,
  type ComplianceOverviewSnapshot,
} from "../../domain/consumer/ComplianceOverview.js";
import {
  ConsumerDisputeDashboard,
  type ConsumerDisputeDashboardSnapshot,
} from "../../domain/consumer/ConsumerDisputeDashboard.js";
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
  ProviderDisputeDashboard,
  type ProviderDisputeDashboardSnapshot,
} from "../../domain/provider/ProviderDisputeDashboard.js";
import {
  ProviderPricingSimulator,
  type ProviderPricingSimulatorSnapshot,
} from "../../domain/provider/ProviderPricingSimulator.js";
import {
  SubprocessorRegistry,
  type SubprocessorRegistrySnapshot,
} from "../../domain/compliance/SubprocessorRegistry.js";

interface ProviderDashboardOverviewEnvelope {
  overview: ProviderDashboardOverviewSnapshot;
}

interface ComplianceOverviewEnvelope {
  overview: ComplianceOverviewSnapshot;
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

interface ConsumerDisputeDashboardEnvelope {
  dashboard: ConsumerDisputeDashboardSnapshot;
}

interface ProviderDisputeDashboardEnvelope {
  dashboard: ProviderDisputeDashboardSnapshot;
}

interface SubprocessorRegistryEnvelope {
  registry: SubprocessorRegistrySnapshot;
}

export class ControlPlaneDashboardClient {
  public constructor(private readonly baseUrl: string) {}

  public async getConsumerDashboardOverview(input: {
    organizationId: string;
    actorUserId: string;
    environment: "development" | "staging" | "production";
  }): Promise<ConsumerDashboardOverview> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/consumer-overview`,
      this.baseUrl,
    );
    url.searchParams.set("actorUserId", input.actorUserId);
    url.searchParams.set("environment", input.environment);

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

  public async getConsumerDisputeDashboard(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ConsumerDisputeDashboard> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/consumer-disputes`,
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
        `Consumer dispute dashboard request failed with status ${String(response.status)}.`,
      );
    }

    const payload = (await response.json()) as ConsumerDisputeDashboardEnvelope;

    return ConsumerDisputeDashboard.create(payload.dashboard);
  }

  public async getSubprocessorRegistry(): Promise<SubprocessorRegistry> {
    const url = new URL("/v1/compliance/subprocessors", this.baseUrl);
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Subprocessor registry request failed with status ${String(response.status)}.`,
      );
    }

    const payload = (await response.json()) as SubprocessorRegistryEnvelope;

    return SubprocessorRegistry.create(payload.registry);
  }

  public async getComplianceOverview(input: {
    organizationId: string;
    actorUserId: string;
    environment: "development" | "staging" | "production";
  }): Promise<ComplianceOverview> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/compliance-overview`,
      this.baseUrl,
    );
    url.searchParams.set("actorUserId", input.actorUserId);
    url.searchParams.set("environment", input.environment);

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Compliance overview request failed with status ${String(response.status)}.`,
      );
    }

    const payload = (await response.json()) as ComplianceOverviewEnvelope;

    return ComplianceOverview.create(payload.overview);
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

  public async getProviderDisputeDashboard(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ProviderDisputeDashboard> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/dashboard/provider-disputes`,
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
        `Provider dispute dashboard request failed with status ${String(response.status)}.`,
      );
    }

    const payload = (await response.json()) as ProviderDisputeDashboardEnvelope;

    return ProviderDisputeDashboard.create(payload.dashboard);
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

  public getComplianceExportUrl(input: {
    organizationId: string;
    actorUserId: string;
    environment: "development" | "staging" | "production";
  }): string {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/compliance/dpa-export`,
      this.baseUrl,
    );
    url.searchParams.set("actorUserId", input.actorUserId);
    url.searchParams.set("environment", input.environment);

    return url.toString();
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

  public async createProviderDispute(input: {
    organizationId: string;
    actorUserId: string;
    disputeType: "settlement" | "chargeback";
    providerOrganizationId?: string;
    paymentReference?: string;
    jobReference?: string;
    disputedAmountUsd: string;
    reasonCode: string;
    summary: string;
    evidenceEntries: {
      label: string;
      value: string;
    }[];
  }): Promise<void> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/finance/provider-disputes`,
      this.baseUrl,
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(
        `Provider dispute create request failed with status ${String(response.status)}.`,
      );
    }
  }

  public async recordProviderDisputeAllocations(input: {
    organizationId: string;
    actorUserId: string;
    disputeId: string;
    allocations: {
      providerOrganizationId: string;
      amountUsd: string;
    }[];
  }): Promise<void> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/finance/provider-disputes/${input.disputeId}/allocations`,
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
        allocations: input.allocations,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Provider dispute allocation request failed with status ${String(response.status)}.`,
      );
    }
  }

  public async updateProviderDisputeStatus(input: {
    organizationId: string;
    actorUserId: string;
    disputeId: string;
    nextStatus:
      | "open"
      | "under_review"
      | "won"
      | "lost"
      | "recovered"
      | "canceled";
  }): Promise<void> {
    const url = new URL(
      `/v1/organizations/${input.organizationId}/finance/provider-disputes/${input.disputeId}/status`,
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
        nextStatus: input.nextStatus,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Provider dispute status update failed with status ${String(response.status)}.`,
      );
    }
  }
}
