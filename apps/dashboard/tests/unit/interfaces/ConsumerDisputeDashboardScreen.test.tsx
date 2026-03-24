import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsumerDisputeDashboardScreen } from "../../../src/interfaces/react/ConsumerDisputeDashboardScreen.js";

type FetchMockCall = [RequestInfo | URL, RequestInit | undefined];

describe("ConsumerDisputeDashboardScreen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits a settlement dispute and refreshes the dashboard snapshot", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ dispute: { id: "dispute-1" } }), {
          status: 201,
          headers: {
            "content-type": "application/json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            dashboard: {
              organizationId: "buyer-org",
              actorRole: "finance",
              activeDisputeCount: 1,
              activeDisputeHoldUsd: "4.00",
              disputes: [
                {
                  id: "dispute-1",
                  disputeType: "settlement",
                  source: "manual",
                  status: "open",
                  paymentReference: null,
                  jobReference: "job_001",
                  disputedAmountUsd: "4.00",
                  allocatedAmountUsd: "4.00",
                  activeHoldUsd: "4.00",
                  reasonCode: "quality_miss",
                  summary: "Provider missed the agreed latency target.",
                  stripeDisputeId: null,
                  stripeChargeId: null,
                  stripeReason: null,
                  stripeStatus: null,
                  createdAt: "2026-03-10T12:00:00.000Z",
                  updatedAt: "2026-03-10T12:00:00.000Z",
                  resolvedAt: null,
                  evidenceEntries: [
                    {
                      label: "log_excerpt",
                      value: "p95 latency exceeded the buyer-approved SLA window",
                    },
                  ],
                  allocations: [
                    {
                      providerOrganizationId: "provider-org",
                      amountUsd: "4.00",
                    },
                  ],
                },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ConsumerDisputeDashboardScreen
        controlPlaneBaseUrl="http://127.0.0.1:3000"
        organizationId="buyer-org"
        actorUserId="buyer-user"
        initialSnapshot={{
          organizationId: "buyer-org",
          actorRole: "finance",
          activeDisputeCount: 0,
          activeDisputeHoldUsd: "0.00",
          disputes: [],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Provider organization ID"), {
      target: { value: "provider-org" },
    });
    fireEvent.change(screen.getByLabelText("Job reference"), {
      target: { value: "job_001" },
    });
    fireEvent.change(screen.getByLabelText("Disputed amount"), {
      target: { value: "4.00" },
    });
    fireEvent.change(screen.getByLabelText("Reason code"), {
      target: { value: "quality_miss" },
    });
    fireEvent.change(screen.getByLabelText("Dispute summary"), {
      target: { value: "Provider missed the agreed latency target." },
    });
    fireEvent.change(screen.getByLabelText("Evidence label"), {
      target: { value: "log_excerpt" },
    });
    fireEvent.change(screen.getByLabelText("Evidence value"), {
      target: { value: "p95 latency exceeded the buyer-approved SLA window" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /create dispute/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock.mock.calls).toHaveLength(2);
    const createRequest = fetchMock.mock.calls[0] as FetchMockCall;
    expect((createRequest[0] as URL).href).toContain(
      "/v1/organizations/buyer-org/finance/provider-disputes",
    );
    expect(screen.getByText("Provider missed the agreed latency target.")).toBeTruthy();
    expect(screen.getByText("Active disputes: 1")).toBeTruthy();
  });

  it("submits a chargeback dispute using payment references and omits settlement fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ dispute: { id: "dispute-2" } }), {
          status: 201,
          headers: {
            "content-type": "application/json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            dashboard: {
              organizationId: "buyer-org",
              actorRole: "finance",
              activeDisputeCount: 1,
              activeDisputeHoldUsd: "0.00",
              disputes: [
                {
                  id: "dispute-2",
                  disputeType: "chargeback",
                  source: "manual",
                  status: "open",
                  paymentReference: "stripe_pi_001",
                  jobReference: null,
                  disputedAmountUsd: "6.00",
                  allocatedAmountUsd: "0.00",
                  activeHoldUsd: "0.00",
                  reasonCode: "fraudulent",
                  summary: "Issuer marked the charge as fraudulent.",
                  stripeDisputeId: null,
                  stripeChargeId: null,
                  stripeReason: null,
                  stripeStatus: null,
                  createdAt: "2026-03-10T12:00:00.000Z",
                  updatedAt: "2026-03-10T12:00:00.000Z",
                  resolvedAt: null,
                  evidenceEntries: [
                    {
                      label: "issuer_note",
                      value: "Cardholder claims unauthorized use.",
                    },
                  ],
                  allocations: [],
                },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ConsumerDisputeDashboardScreen
        controlPlaneBaseUrl="http://127.0.0.1:3000"
        organizationId="buyer-org"
        actorUserId="buyer-user"
        initialSnapshot={{
          organizationId: "buyer-org",
          actorRole: "finance",
          activeDisputeCount: 0,
          activeDisputeHoldUsd: "0.00",
          disputes: [],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Dispute type"), {
      target: { value: "chargeback" },
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Payment reference")).toBeTruthy();
    });
    expect(screen.queryByLabelText("Provider organization ID")).toBeNull();
    expect(screen.queryByLabelText("Job reference")).toBeNull();
    fireEvent.change(screen.getByLabelText("Payment reference"), {
      target: { value: "stripe_pi_001" },
    });
    fireEvent.change(screen.getByLabelText("Disputed amount"), {
      target: { value: "6.00" },
    });
    fireEvent.change(screen.getByLabelText("Reason code"), {
      target: { value: "fraudulent" },
    });
    fireEvent.change(screen.getByLabelText("Dispute summary"), {
      target: { value: "Issuer marked the charge as fraudulent." },
    });
    fireEvent.change(screen.getByLabelText("Evidence label"), {
      target: { value: "issuer_note" },
    });
    fireEvent.change(screen.getByLabelText("Evidence value"), {
      target: { value: "Cardholder claims unauthorized use." },
    });
    fireEvent.submit(screen.getByRole("button", { name: /create dispute/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const createRequest = fetchMock.mock.calls[0] as FetchMockCall;
    expect(
      JSON.parse(
        typeof createRequest[1]?.body === "string" ? createRequest[1].body : "{}",
      ),
    ).toEqual({
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
    expect(screen.getByText("Dispute ID: N/A")).toBeTruthy();
    expect(screen.getByText("Charge ID: N/A")).toBeTruthy();
  });

  it("records chargeback allocations, updates status, and surfaces allocation failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 500,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ dispute: { id: "dispute-3" } }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            dashboard: {
              organizationId: "buyer-org",
              actorRole: "finance",
              activeDisputeCount: 1,
              activeDisputeHoldUsd: "2.50",
              disputes: [
                {
                  id: "dispute-3",
                  disputeType: "chargeback",
                  source: "manual",
                  status: "lost",
                  paymentReference: "stripe_pi_002",
                  jobReference: null,
                  disputedAmountUsd: "6.00",
                  allocatedAmountUsd: "2.50",
                  activeHoldUsd: "2.50",
                  reasonCode: "fraudulent",
                  summary: "Issuer marked the charge as fraudulent.",
                  stripeDisputeId: null,
                  stripeChargeId: null,
                  stripeReason: null,
                  stripeStatus: null,
                  createdAt: "2026-03-10T12:00:00.000Z",
                  updatedAt: "2026-03-10T12:08:00.000Z",
                  resolvedAt: null,
                  evidenceEntries: [
                    {
                      label: "issuer_note",
                      value: "Cardholder claims unauthorized use.",
                    },
                  ],
                  allocations: [
                    {
                      providerOrganizationId: "provider-org",
                      amountUsd: "2.50",
                    },
                  ],
                },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ConsumerDisputeDashboardScreen
        controlPlaneBaseUrl="http://127.0.0.1:3000"
        organizationId="buyer-org"
        actorUserId="buyer-user"
        initialSnapshot={{
          organizationId: "buyer-org",
          actorRole: "finance",
          activeDisputeCount: 1,
          activeDisputeHoldUsd: "0.00",
          disputes: [
            {
              id: "dispute-3",
              disputeType: "chargeback",
              source: "manual",
              status: "open",
              paymentReference: "stripe_pi_002",
              jobReference: null,
              disputedAmountUsd: "6.00",
              allocatedAmountUsd: "0.00",
              activeHoldUsd: "0.00",
              reasonCode: "fraudulent",
              summary: "Issuer marked the charge as fraudulent.",
              stripeDisputeId: null,
              stripeChargeId: null,
              stripeReason: null,
              stripeStatus: null,
              createdAt: "2026-03-10T12:00:00.000Z",
              updatedAt: "2026-03-10T12:00:00.000Z",
              resolvedAt: null,
              evidenceEntries: [
                {
                  label: "issuer_note",
                  value: "Cardholder claims unauthorized use.",
                },
              ],
              allocations: [],
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /update status/i }));
    expect(fetchMock).toHaveBeenCalledTimes(0);

    fireEvent.change(screen.getByLabelText("Allocation provider dispute-3"), {
      target: { value: "provider-org" },
    });
    fireEvent.change(screen.getByLabelText("Allocation amount dispute-3"), {
      target: { value: "2.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /record allocation/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Provider dispute allocation request failed with status 500.",
        ),
      ).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Next status dispute-3"), {
      target: { value: "lost" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update status/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const statusRequest = fetchMock.mock.calls[1] as FetchMockCall;
    expect((statusRequest[0] as URL).href).toContain(
      "/v1/organizations/buyer-org/finance/provider-disputes/dispute-3/status",
    );
    expect(
      JSON.parse(
        typeof statusRequest[1]?.body === "string" ? statusRequest[1].body : "{}",
      ),
    ).toEqual({
      actorUserId: "buyer-user",
      nextStatus: "lost",
    });
    expect(screen.getByText("Active hold $2.50")).toBeTruthy();
    expect(
      screen.queryByText(
        "Provider dispute allocation request failed with status 500.",
      ),
    ).toBeNull();
  });
});
