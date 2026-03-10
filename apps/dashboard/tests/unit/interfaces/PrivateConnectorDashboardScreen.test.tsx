import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateConnectorDashboardScreen } from "../../../src/interfaces/react/PrivateConnectorDashboardScreen.js";

type FetchMockSignature = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

describe("PrivateConnectorDashboardScreen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders connector status, mappings, and the gateway curl snippet", () => {
    render(
      <PrivateConnectorDashboardScreen
        controlPlaneBaseUrl="http://127.0.0.1:3100"
        organizationId="org-123"
        actorUserId="user-123"
        initialSnapshot={{
          organizationId: "org-123",
          actorRole: "finance",
          readyConnectorCount: 1,
          staleConnectorCount: 1,
          connectors: [
            {
              id: "connector-1",
              label: "Primary connector",
              environment: "development",
              mode: "cluster",
              status: "ready",
              endpointUrl: "http://connector.internal",
              runtimeVersion: "runtime-1",
              lastCheckInAt: "2026-03-10T10:00:00.000Z",
              modelMappings: [
                {
                  requestModelAlias: "openai/gpt-oss-120b-like",
                  upstreamModelId: "gpt-oss-120b-instruct",
                },
              ],
            },
            {
              id: "connector-2",
              label: "Backup connector",
              environment: "staging",
              mode: "byok_api",
              status: "stale",
              endpointUrl: "https://api.example.com",
              runtimeVersion: null,
              lastCheckInAt: null,
              modelMappings: [],
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /private connectors for org-123/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Primary connector")).toBeTruthy();
    expect(screen.getByText("Backup connector")).toBeTruthy();
    expect(screen.getByText("openai/gpt-oss-120b-like")).toBeTruthy();
    expect(
      screen.getByText(/x-compushare-private-connector-id: connector-1/i),
    ).toBeTruthy();
  });

  it("posts the create flow and refreshes the dashboard snapshot", async () => {
    const fetchMock = vi
      .fn<FetchMockSignature>()
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ connector: { id: "connector-1" } }), {
            status: 201,
            headers: {
              "content-type": "application/json",
            },
          }),
        ),
      )
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              dashboard: {
                organizationId: "org-123",
                actorRole: "finance",
                readyConnectorCount: 1,
                staleConnectorCount: 0,
                connectors: [
                  {
                    id: "connector-1",
                    label: "Fresh connector",
                    environment: "development",
                    mode: "cluster",
                    status: "ready",
                    endpointUrl: "http://connector.internal",
                    runtimeVersion: "runtime-1",
                    lastCheckInAt: "2026-03-10T10:00:00.000Z",
                    modelMappings: [
                      {
                        requestModelAlias: "openai/gpt-oss-120b-like",
                        upstreamModelId: "gpt-oss-120b-instruct",
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
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PrivateConnectorDashboardScreen
        controlPlaneBaseUrl="http://127.0.0.1:3100"
        organizationId="org-123"
        actorUserId="user-123"
        initialSnapshot={{
          organizationId: "org-123",
          actorRole: "finance",
          readyConnectorCount: 0,
          staleConnectorCount: 0,
          connectors: [],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Connector label"), {
      target: { value: "Fresh connector" },
    });
    fireEvent.change(screen.getByLabelText("Connector endpoint URL"), {
      target: { value: "http://connector.internal" },
    });
    fireEvent.change(screen.getByLabelText("Connector request model alias"), {
      target: { value: "openai/gpt-oss-120b-like" },
    });
    fireEvent.change(screen.getByLabelText("Connector upstream model ID"), {
      target: { value: "gpt-oss-120b-instruct" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create connector/i }));

    await waitFor(() => {
      expect(screen.getByText("Fresh connector")).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, createInit] = fetchMock.mock.calls[0] ?? [];

    expect(createInit).toMatchObject({
      method: "POST",
    });
    expect(
      JSON.parse(typeof createInit?.body === "string" ? createInit.body : "{}"),
    ).toMatchObject({
      actorUserId: "user-123",
      label: "Fresh connector",
      endpointUrl: "http://connector.internal",
      modelMappings: [
        {
          requestModelAlias: "openai/gpt-oss-120b-like",
          upstreamModelId: "gpt-oss-120b-instruct",
        },
      ],
    });
  });

  it("renders create failures explicitly", async () => {
    const fetchMock = vi.fn<FetchMockSignature>(() =>
      Promise.resolve(new Response(null, { status: 403 })),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PrivateConnectorDashboardScreen
        controlPlaneBaseUrl="http://127.0.0.1:3100"
        organizationId="org-123"
        actorUserId="user-123"
        initialSnapshot={{
          organizationId: "org-123",
          actorRole: "finance",
          readyConnectorCount: 0,
          staleConnectorCount: 0,
          connectors: [],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Connector label"), {
      target: { value: "Blocked connector" },
    });
    fireEvent.change(screen.getByLabelText("Connector endpoint URL"), {
      target: { value: "http://connector.internal" },
    });
    fireEvent.change(screen.getByLabelText("Connector request model alias"), {
      target: { value: "openai/gpt-oss-120b-like" },
    });
    fireEvent.change(screen.getByLabelText("Connector upstream model ID"), {
      target: { value: "gpt-oss-120b-instruct" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create connector/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.getByRole("alert").textContent).toContain("status 403");
  });
});
