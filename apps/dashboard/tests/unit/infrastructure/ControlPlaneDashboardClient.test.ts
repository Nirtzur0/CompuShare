import { afterEach, describe, expect, it, vi } from "vitest";
import { ControlPlaneDashboardClient } from "../../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import type { ConsumerDashboardOverviewSnapshot } from "../../../src/domain/consumer/ConsumerDashboardOverview.js";
import type { ProviderDashboardOverviewSnapshot } from "../../../src/domain/provider/ProviderDashboardOverview.js";

type FetchMockSignature = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

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
    });

    expect(overview.actorRole).toBe("finance");
    expect(overview.spendCards[1]?.valueUsd).toBe("50.00");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];

    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/consumer-overview?actorUserId=user-123",
    );
    expect(requestInit).toMatchObject({
      cache: "no-store",
    });
  });

  it("loads a provider dashboard overview from the control-plane", async () => {
    const snapshot: ProviderDashboardOverviewSnapshot = {
      organizationId: "org-123",
      actorRole: "finance",
      activeNodeCount: 2,
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
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];

    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).href).toContain(
      "/v1/organizations/org-123/dashboard/provider-overview?actorUserId=user-123",
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
      }),
    ).rejects.toThrow("Consumer dashboard request failed with status 403.");
  });
});
