import { afterEach, describe, expect, it, vi } from "vitest";
import type { SubprocessorRegistrySnapshot } from "../../../src/domain/compliance/SubprocessorRegistry.js";
import type { ComplianceOverviewSnapshot } from "../../../src/domain/consumer/ComplianceOverview.js";
import { ControlPlaneDashboardClient } from "../../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import type { ConsumerDashboardOverviewSnapshot } from "../../../src/domain/consumer/ConsumerDashboardOverview.js";
import type { ConsumerDisputeDashboardSnapshot } from "../../../src/domain/consumer/ConsumerDisputeDashboard.js";
import type { PrivateConnectorDashboardSnapshot } from "../../../src/domain/consumer/PrivateConnectorDashboard.js";
import type { ProviderDashboardOverviewSnapshot } from "../../../src/domain/provider/ProviderDashboardOverview.js";
import type { ProviderDisputeDashboardSnapshot } from "../../../src/domain/provider/ProviderDisputeDashboard.js";
import type { ProviderPricingSimulatorSnapshot } from "../../../src/domain/provider/ProviderPricingSimulator.js";

type FetchMockSignature = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function expectUrlCall(call: [RequestInfo | URL, RequestInit | undefined]): URL {
  expect(call[0]).toBeInstanceOf(URL);
  return call[0] as URL;
}

describe("ControlPlaneDashboardClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a consumer dashboard overview from the control-plane", async () => {
    const snapshot: ConsumerDashboardOverviewSnapshot = {
      organizationId: "org-123",
      actorRole: "finance",
      spendSummary: {
        lifetimeFundedUsd: "100.00",
        lifetimeSettledSpendUsd: "50.00",
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "50.00",
        spendCreditsUsd: "5.00",
        pendingEarningsUsd: "0.00",
        withdrawableCashUsd: "0.00",
      },
      usageTrend: [
        {
          date: "2026-03-08",
          requestCount: 1,
          totalTokens: 2048,
        },
      ],
      latencyByModel: [
        {
          modelAlias: "openai/gpt-oss-120b-like",
          requestCount: 1,
          avgLatencyMs: 180,
          p95LatencyMs: 180,
          totalTokens: 2048,
        },
      ],
      gatewayQuotaStatus: {
        environment: "development",
        fixedDayStartedAt: "2026-03-08T00:00:00.000Z",
        fixedDayResetsAt: "2026-03-09T00:00:00.000Z",
        fixedDayTokenLimit: 2000000,
        fixedDayUsedTokens: 2048,
        fixedDayRemainingTokens: 1997952,
        syncRequestsPerMinutePerApiKey: 60,
        maxBatchItemsPerJob: 500,
        maxActiveBatchesPerOrganizationEnvironment: 5,
      },
    };
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ overview: snapshot }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");
    const overview = await client.getConsumerDashboardOverview({
      organizationId: "org-123",
      actorUserId: "user-123",
      environment: "development",
    });

    expect(overview.actorRole).toBe("finance");
    expect(overview.spendCards[1]?.valueUsd).toBe("50.00");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls).toHaveLength(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/consumer-overview?actorUserId=user-123&environment=development",
    );
    expect(requestInit).toMatchObject({
      cache: "no-store",
    });
  });

  it("loads the public subprocessor registry from the control-plane", async () => {
    const snapshot: SubprocessorRegistrySnapshot = {
      generatedAt: "2026-03-10T12:00:00.000Z",
      legalEntityName: "CompuShare, Inc.",
      privacyEmail: "privacy@example.com",
      securityEmail: "security@example.com",
      dpaEffectiveDate: "2026-03-10",
      dpaVersion: "2026.03",
      environment: null,
      platformSubprocessors: [],
      providerSubprocessors: [],
      providerAppendixStatus: "not_applicable",
    };
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ registry: snapshot }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");
    const registry = await client.getSubprocessorRegistry();

    expect(registry.legalEntityName).toBe("CompuShare, Inc.");
    expect(fetchMock.mock.calls).toHaveLength(1);
    const [requestUrl] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect((requestUrl as URL).href).toContain("/v1/compliance/subprocessors");
  });

  it("loads a buyer compliance overview from the control-plane", async () => {
    const snapshot: ComplianceOverviewSnapshot = {
      organizationId: "org-123",
      actorRole: "finance",
      registry: {
        generatedAt: "2026-03-10T12:00:00.000Z",
        legalEntityName: "CompuShare, Inc.",
        privacyEmail: "privacy@example.com",
        securityEmail: "security@example.com",
        dpaEffectiveDate: "2026-03-10",
        dpaVersion: "2026.03",
        environment: "development",
        platformSubprocessors: [],
        providerSubprocessors: [],
        providerAppendixStatus: "none_routable",
      },
    };
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ overview: snapshot }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");
    const overview = await client.getComplianceOverview({
      organizationId: "org-123",
      actorUserId: "user-123",
      environment: "development",
    });

    expect(overview.actorRole).toBe("finance");
    expect(fetchMock.mock.calls).toHaveLength(1);
    const [requestUrl] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/compliance-overview?actorUserId=user-123&environment=development",
    );
  });

  it("loads a provider dashboard overview from the control-plane", async () => {
    const snapshot: ProviderDashboardOverviewSnapshot = {
      organizationId: "org-123",
      actorRole: "finance",
      activeNodeCount: 2,
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "4.25",
      recentLostDisputeCount90d: 2,
      healthSummary: {
        healthy: 1,
        degraded: 1,
        paused: 0,
      },
      trustTierSummary: {
        community: 0,
        vetted: 1,
        attested: 1,
      },
      balances: {
        organizationId: "org-123",
        usageBalanceUsd: "25.00",
        spendCreditsUsd: "5.00",
        pendingEarningsUsd: "11.25",
        withdrawableCashUsd: "7.75",
      },
      earningsTrend: [
        {
          date: "2026-03-08",
          earningsUsd: "12.00",
          reserveHoldbackUsd: "1.00",
        },
      ],
      estimatedUtilizationTrend: [
        {
          date: "2026-03-08",
          totalTokens: 2400,
          estimatedUtilizationPercent: 0.01,
        },
      ],
      nodes: [],
    };
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ overview: snapshot }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");
    const overview = await client.getProviderDashboardOverview({
      organizationId: "org-123",
      actorUserId: "user-123",
    });

    expect(overview.actorRole).toBe("finance");
    expect(overview.balanceCards[2]?.valueUsd).toBe("7.75");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls).toHaveLength(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/provider-overview?actorUserId=user-123",
    );
    expect(requestInit).toMatchObject({
      cache: "no-store",
    });
  });

  it("loads a private connector dashboard from the control-plane", async () => {
    const snapshot: PrivateConnectorDashboardSnapshot = {
      organizationId: "org-123",
      actorRole: "finance",
      readyConnectorCount: 1,
      staleConnectorCount: 1,
      connectors: [],
    };
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ dashboard: snapshot }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");
    const dashboard = await client.getPrivateConnectorDashboard({
      organizationId: "org-123",
      actorUserId: "user-123",
    });

    expect(dashboard.readyConnectorCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls).toHaveLength(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/private-connectors?actorUserId=user-123",
    );
    expect(requestInit).toMatchObject({
      cache: "no-store",
    });
  });

  it("loads buyer and provider dispute dashboards from the control-plane", async () => {
    const consumerSnapshot: ConsumerDisputeDashboardSnapshot = {
      organizationId: "org-123",
      actorRole: "finance",
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "4.00",
      disputes: [],
    };
    const providerSnapshot: ProviderDisputeDashboardSnapshot = {
      organizationId: "org-456",
      actorRole: "finance",
      activeDisputeCount: 1,
      activeDisputeHoldUsd: "2.50",
      recentLostDisputeCount90d: 1,
      disputes: [],
    };
    const fetchMock = vi
      .fn<FetchMockSignature>()
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ dashboard: consumerSnapshot }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ dashboard: providerSnapshot }), {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");
    const consumerDashboard = await client.getConsumerDisputeDashboard({
      organizationId: "org-123",
      actorUserId: "user-123",
    });
    const providerDashboard = await client.getProviderDisputeDashboard({
      organizationId: "org-456",
      actorUserId: "user-456",
    });

    expect(consumerDashboard.activeDisputeHoldUsd).toBe("4.00");
    expect(providerDashboard.recentLostDisputeCount90d).toBe(1);
    expect(fetchMock.mock.calls).toHaveLength(2);
    const [consumerUrl] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    const [providerUrl] = fetchMock.mock.calls[1] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect((consumerUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/consumer-disputes?actorUserId=user-123",
    );
    expect((providerUrl as URL).href).toContain(
      "/v1/organizations/org-456/dashboard/provider-disputes?actorUserId=user-456",
    );
  });

  it("loads a provider pricing simulator from the control-plane", async () => {
    const snapshot: ProviderPricingSimulatorSnapshot = {
      organizationId: "org-123",
      actorRole: "finance",
      simulatableNodeCount: 1,
      unavailableNodeCount: 1,
      assumptions: {
        usageObservationDays: 7,
        settlementEconomicsDays: 30,
        projectionDays: 30,
        netProjectionStatus: "available",
        settlementCount: 2,
        realizedPlatformFeePercent: 12,
        realizedReserveHoldbackPercent: 4,
        realizedWithdrawablePercent: 80,
      },
      nodes: [],
    };
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ simulator: snapshot }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");
    const simulator = await client.getProviderPricingSimulator({
      organizationId: "org-123",
      actorUserId: "user-123",
    });

    expect(simulator.actorRole).toBe("finance");
    expect(simulator.simulatableNodeCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls).toHaveLength(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/provider-pricing-simulator?actorUserId=user-123",
    );
    expect(requestInit).toMatchObject({
      cache: "no-store",
    });
  });

  it("raises a typed error when the control-plane returns a failing status", async () => {
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(null, {
          status: 403,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");

    await expect(
      client.getProviderDashboardOverview({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).rejects.toThrow("Provider dashboard request failed with status 403.");

    await expect(
      client.getConsumerDashboardOverview({
        organizationId: "org-123",
        actorUserId: "user-123",
        environment: "development",
      }),
    ).rejects.toThrow("Consumer dashboard request failed with status 403.");

    await expect(
      client.getProviderPricingSimulator({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).rejects.toThrow(
      "Provider pricing simulator request failed with status 403.",
    );
  });

  it("builds a DPA export download URL", () => {
    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");

    expect(
      client.getComplianceExportUrl({
        organizationId: "org-123",
        actorUserId: "user-123",
        environment: "production",
      }),
    ).toBe(
      "http://127.0.0.1:3000/v1/organizations/org-123/compliance/dpa-export?actorUserId=user-123&environment=production",
    );
  });

  it("posts private connector creation to the control-plane", async () => {
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ connector: { id: "connector-1" } }), {
          status: 201,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");

    await expect(
      client.createPrivateConnector({
        organizationId: "org-123",
        actorUserId: "user-123",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [
          {
            requestModelAlias: "openai/gpt-oss-120b-like",
            upstreamModelId: "gpt-oss-120b-instruct",
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls).toHaveLength(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/private-connectors",
    );
    expect(requestInit).toMatchObject({
      method: "POST",
      cache: "no-store",
    });
    expect(
      JSON.parse(
        typeof requestInit?.body === "string" ? requestInit.body : "{}",
      ),
    ).toMatchObject({
      actorUserId: "user-123",
      environment: "development",
      label: "Primary connector",
      mode: "cluster",
      endpointUrl: "http://connector.internal",
      modelMappings: [
        {
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct",
        },
      ],
    });
  });

  it("posts provider dispute mutations to the control-plane", async () => {
    const fetchMock = vi
      .fn<FetchMockSignature>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");

    await client.createProviderDispute({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeType: "chargeback",
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
      reasonCode: "fraudulent",
      summary: "Issuer marked the charge as fraudulent.",
      evidenceEntries: [
        {
          label: "issuer_note",
          value: "Cardholder claims unauthorized use.",
        },
      ],
    });
    await client.recordProviderDisputeAllocations({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeId: "dispute-1",
      allocations: [
        {
          providerOrganizationId: "provider-org",
          amountUsd: "2.50",
        },
      ],
    });
    await client.updateProviderDisputeStatus({
      organizationId: "buyer-org",
      actorUserId: "buyer-user",
      disputeId: "dispute-1",
      nextStatus: "lost",
    });

    expect(fetchMock.mock.calls).toHaveLength(3);
    const createRequest = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    const allocationRequest = fetchMock.mock.calls[1] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    const statusRequest = fetchMock.mock.calls[2] as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];

    expect(expectUrlCall(createRequest).href).toContain(
      "/v1/organizations/buyer-org/finance/provider-disputes",
    );
    expect(
      JSON.parse(
        typeof createRequest[1]?.body === "string" ? createRequest[1].body : "{}",
      ),
    ).toMatchObject({
      paymentReference: "stripe_pi_001",
      disputedAmountUsd: "6.00",
    });
    expect(expectUrlCall(allocationRequest).href).toContain(
      "/v1/organizations/buyer-org/finance/provider-disputes/dispute-1/allocations",
    );
    expect(
      JSON.parse(
        typeof allocationRequest[1]?.body === "string"
          ? allocationRequest[1].body
          : "{}",
      ),
    ).toEqual({
      actorUserId: "buyer-user",
      allocations: [
        {
          providerOrganizationId: "provider-org",
          amountUsd: "2.50",
        },
      ],
    });
    expect(expectUrlCall(statusRequest).href).toContain(
      "/v1/organizations/buyer-org/finance/provider-disputes/dispute-1/status",
    );
    expect(
      JSON.parse(
        typeof statusRequest[1]?.body === "string" ? statusRequest[1].body : "{}",
      ),
    ).toEqual({
      actorUserId: "buyer-user",
      nextStatus: "lost",
    });
  });

  it("raises explicit errors for the remaining dispute and compliance request surfaces", async () => {
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(
        new Response(null, {
          status: 403,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new ControlPlaneDashboardClient("http://127.0.0.1:3000");

    await expect(client.getSubprocessorRegistry()).rejects.toThrow(
      "Subprocessor registry request failed with status 403.",
    );
    await expect(
      client.getComplianceOverview({
        organizationId: "org-123",
        actorUserId: "user-123",
        environment: "development",
      }),
    ).rejects.toThrow("Compliance overview request failed with status 403.");
    await expect(
      client.getPrivateConnectorDashboard({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).rejects.toThrow(
      "Private connector dashboard request failed with status 403.",
    );
    await expect(
      client.getConsumerDisputeDashboard({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).rejects.toThrow(
      "Consumer dispute dashboard request failed with status 403.",
    );
    await expect(
      client.getProviderDisputeDashboard({
        organizationId: "org-123",
        actorUserId: "user-123",
      }),
    ).rejects.toThrow(
      "Provider dispute dashboard request failed with status 403.",
    );
    await expect(
      client.createPrivateConnector({
        organizationId: "org-123",
        actorUserId: "user-123",
        environment: "development",
        label: "Primary connector",
        mode: "cluster",
        endpointUrl: "http://connector.internal",
        modelMappings: [],
      }),
    ).rejects.toThrow(
      "Private connector create request failed with status 403.",
    );
    await expect(
      client.createProviderDispute({
        organizationId: "org-123",
        actorUserId: "user-123",
        disputeType: "chargeback",
        paymentReference: "stripe_pi_001",
        disputedAmountUsd: "6.00",
        reasonCode: "fraudulent",
        summary: "Issuer marked the charge as fraudulent.",
        evidenceEntries: [],
      }),
    ).rejects.toThrow(
      "Provider dispute create request failed with status 403.",
    );
    await expect(
      client.recordProviderDisputeAllocations({
        organizationId: "org-123",
        actorUserId: "user-123",
        disputeId: "dispute-1",
        allocations: [],
      }),
    ).rejects.toThrow(
      "Provider dispute allocation request failed with status 403.",
    );
    await expect(
      client.updateProviderDisputeStatus({
        organizationId: "org-123",
        actorUserId: "user-123",
        disputeId: "dispute-1",
        nextStatus: "lost",
      }),
    ).rejects.toThrow(
      "Provider dispute status update failed with status 403.",
    );

    expect(fetchMock).toHaveBeenCalledTimes(9);
  });
});
