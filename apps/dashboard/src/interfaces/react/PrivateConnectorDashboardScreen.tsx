"use client";

import React, { useState } from "react";
import {
  PrivateConnectorDashboard,
  type PrivateConnectorDashboardSnapshot,
  type PrivateConnectorStatus,
} from "../../domain/consumer/PrivateConnectorDashboard.js";
import { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";

export interface PrivateConnectorDashboardScreenProps {
  controlPlaneBaseUrl: string;
  organizationId: string;
  actorUserId: string;
  initialSnapshot: PrivateConnectorDashboardSnapshot;
}

interface CreatePrivateConnectorFormState {
  label: string;
  environment: "development" | "staging" | "production";
  mode: "cluster" | "byok_api";
  endpointUrl: string;
  requestModelAlias: string;
  upstreamModelId: string;
}

const initialFormState: CreatePrivateConnectorFormState = {
  label: "",
  environment: "development",
  mode: "cluster",
  endpointUrl: "",
  requestModelAlias: "",
  upstreamModelId: "",
};

function cardToneClass(tone: "neutral" | "success" | "warning"): string {
  switch (tone) {
    case "neutral":
      return "card neutral";
    case "success":
      return "card success";
    case "warning":
      return "card warning";
  }
}

function formatStatusLabel(status: PrivateConnectorStatus): string {
  switch (status) {
    case "pending":
      return "pending";
    case "ready":
      return "ready";
    case "stale":
      return "stale";
    case "disabled":
      return "disabled";
  }
}

function formatModeLabel(mode: "cluster" | "byok_api"): string {
  return mode === "cluster" ? "Cluster" : "BYOK API";
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "No check-in yet";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function PrivateConnectorDashboardScreen(
  props: PrivateConnectorDashboardScreenProps,
) {
  const [dashboardSnapshot, setDashboardSnapshot] = useState(
    props.initialSnapshot,
  );
  const [formState, setFormState] =
    useState<CreatePrivateConnectorFormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dashboard = PrivateConnectorDashboard.create(dashboardSnapshot);
  const client = new ControlPlaneDashboardClient(props.controlPlaneBaseUrl);
  const primaryConnector = dashboard.connectors[0] ?? null;
  const curlConnectorId = primaryConnector?.id ?? "<connector_uuid>";

  async function refreshDashboard(): Promise<void> {
    const refreshed = await client.getPrivateConnectorDashboard({
      organizationId: props.organizationId,
      actorUserId: props.actorUserId,
    });

    setDashboardSnapshot(refreshed.toSnapshot());
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await client.createPrivateConnector({
        organizationId: props.organizationId,
        actorUserId: props.actorUserId,
        environment: formState.environment,
        label: formState.label,
        mode: formState.mode,
        endpointUrl: formState.endpointUrl,
        modelMappings: [
          {
            requestModelAlias: formState.requestModelAlias,
            upstreamModelId: formState.upstreamModelId,
          },
        ],
      });
      setFormState(initialFormState);
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create connector.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Consumer private connectors</p>
          <h1>{dashboard.title}</h1>
          <p className="hero-copy">
            Private routing is explicit per request. Connectors stay buyer
            scoped, customer operated, and never fall back to marketplace
            placement.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">Role: {dashboard.actorRole}</span>
          <span className="pill">
            Ready: {dashboard.readyConnectorCount} /{" "}
            {dashboard.connectors.length}
          </span>
          <span className="pill">Stale: {dashboard.staleConnectorCount}</span>
        </div>
      </section>

      <section className="card-grid">
        <article className={cardToneClass("success")}>
          <p className="card-label">Ready connectors</p>
          <p className="card-value">{dashboard.readyConnectorCount}</p>
          <p className="card-caption">
            Runtime has checked in within the last two minutes.
          </p>
        </article>
        <article className={cardToneClass("warning")}>
          <p className="card-label">Pending or stale</p>
          <p className="card-value">
            {dashboard.pendingConnectorCount + dashboard.staleConnectorCount}
          </p>
          <p className="card-caption">
            Connectors that still need a fresh runtime heartbeat.
          </p>
        </article>
        <article className={cardToneClass("neutral")}>
          <p className="card-label">Disabled connectors</p>
          <p className="card-value">{dashboard.disabledConnectorCount}</p>
          <p className="card-caption">
            Disabled connectors remain visible but never receive gateway
            traffic.
          </p>
        </article>
      </section>

      <section className="inventory-panel private-connector-form-panel">
        <div className="inventory-header private-connector-header">
          <div>
            <p className="eyebrow">Create connector</p>
            <h2>Register a buyer-scoped connector</h2>
          </div>
          <p className="inventory-note">
            This writes control-plane metadata only. Secrets stay in the
            customer-operated runtime.
          </p>
        </div>

        <form
          className="private-connector-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="pricing-input">
            <span className="card-label">Label</span>
            <input
              aria-label="Connector label"
              value={formState.label}
              onChange={(event) => {
                const value = event.currentTarget.value;

                setFormState((current) => ({
                  ...current,
                  label: value,
                }));
              }}
              required
              minLength={3}
            />
          </label>

          <label className="pricing-input">
            <span className="card-label">Environment</span>
            <select
              aria-label="Connector environment"
              value={formState.environment}
              onChange={(event) => {
                const value =
                  event.currentTarget
                    .value as CreatePrivateConnectorFormState["environment"];

                setFormState((current) => ({
                  ...current,
                  environment: value,
                }));
              }}
            >
              <option value="development">development</option>
              <option value="staging">staging</option>
              <option value="production">production</option>
            </select>
          </label>

          <label className="pricing-input">
            <span className="card-label">Mode</span>
            <select
              aria-label="Connector mode"
              value={formState.mode}
              onChange={(event) => {
                const value =
                  event.currentTarget.value as CreatePrivateConnectorFormState["mode"];

                setFormState((current) => ({
                  ...current,
                  mode: value,
                }));
              }}
            >
              <option value="cluster">cluster</option>
              <option value="byok_api">byok_api</option>
            </select>
          </label>

          <label className="pricing-input private-connector-form-span">
            <span className="card-label">Forward endpoint URL</span>
            <input
              aria-label="Connector endpoint URL"
              type="url"
              value={formState.endpointUrl}
              onChange={(event) => {
                const value = event.currentTarget.value;

                setFormState((current) => ({
                  ...current,
                  endpointUrl: value,
                }));
              }}
              required
            />
          </label>

          <label className="pricing-input">
            <span className="card-label">Gateway model alias</span>
            <input
              aria-label="Connector request model alias"
              value={formState.requestModelAlias}
              onChange={(event) => {
                const value = event.currentTarget.value;

                setFormState((current) => ({
                  ...current,
                  requestModelAlias: value,
                }));
              }}
              required
              minLength={3}
            />
          </label>

          <label className="pricing-input">
            <span className="card-label">Upstream model ID</span>
            <input
              aria-label="Connector upstream model ID"
              value={formState.upstreamModelId}
              onChange={(event) => {
                const value = event.currentTarget.value;

                setFormState((current) => ({
                  ...current,
                  upstreamModelId: value,
                }));
              }}
              required
              minLength={3}
            />
          </label>

          <div className="private-connector-form-actions">
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create connector"}
            </button>
            {errorMessage === null ? null : (
              <p className="private-connector-error" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="inventory-panel">
        <div className="inventory-header private-connector-header">
          <div>
            <p className="eyebrow">Gateway usage</p>
            <h2>Explicit private routing header</h2>
          </div>
          <p className="inventory-note">
            The gateway only routes privately when you set a specific connector
            ID on the request.
          </p>
        </div>
        <pre className="private-connector-snippet">
{`curl -X POST "$GATEWAY_BASE_URL/v1/chat/completions" \\
  -H "Authorization: Bearer <org_api_key>" \\
  -H "Content-Type: application/json" \\
  -H "x-compushare-private-connector-id: ${curlConnectorId}" \\
  -d '{"model":"${primaryConnector?.modelMappings[0]?.requestModelAlias ?? "openai/gpt-oss-120b-like"}","messages":[{"role":"user","content":"Hello"}]}'`}
        </pre>
      </section>

      <section className="pricing-node-grid">
        {dashboard.connectors.map((connector) => (
          <article className="inventory-panel pricing-node-card" key={connector.id}>
            <div className="inventory-header private-connector-header">
              <div>
                <p className="eyebrow">Connector</p>
                <h2>{connector.label}</h2>
                <p className="inventory-note">{connector.endpointUrl}</p>
              </div>
              <div className="pricing-node-meta">
                <span className={`status status-${connector.status}`}>
                  {formatStatusLabel(connector.status)}
                </span>
                <span className="pill">{formatModeLabel(connector.mode)}</span>
                <span className="pill">{connector.environment}</span>
              </div>
            </div>

            <div className="pricing-baseline-grid private-connector-baseline-grid">
              <div>
                <p className="card-label">Runtime version</p>
                <p className="pricing-metric">
                  {connector.runtimeVersion ?? "Not reported"}
                </p>
              </div>
              <div>
                <p className="card-label">Last check-in</p>
                <p className="pricing-metric private-connector-date">
                  {formatDateTime(connector.lastCheckInAt)}
                </p>
              </div>
              <div>
                <p className="card-label">Model mappings</p>
                <p className="pricing-metric">{connector.modelMappings.length}</p>
              </div>
            </div>

            <div className="private-connector-mappings">
              {connector.modelMappings.map((mapping) => (
                <div className="private-connector-mapping" key={mapping.requestModelAlias}>
                  <strong>{mapping.requestModelAlias}</strong>
                  <span>{mapping.upstreamModelId}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
