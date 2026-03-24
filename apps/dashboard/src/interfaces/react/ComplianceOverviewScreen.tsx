"use client";

import React from "react";
import {
  ComplianceOverview,
  type ComplianceOverviewSnapshot,
} from "../../domain/consumer/ComplianceOverview.js";
import { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";

export interface ComplianceOverviewScreenProps {
  controlPlaneBaseUrl: string;
  organizationId: string;
  actorUserId: string;
  environment: "development" | "staging" | "production";
  initialSnapshot: ComplianceOverviewSnapshot;
}

export function ComplianceOverviewScreen(
  props: ComplianceOverviewScreenProps,
) {
  const overview = ComplianceOverview.create(props.initialSnapshot);
  const registry = overview.registry;
  const client = new ControlPlaneDashboardClient(props.controlPlaneBaseUrl);
  const exportUrl = client.getComplianceExportUrl({
    organizationId: props.organizationId,
    actorUserId: props.actorUserId,
    environment: props.environment,
  });

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Consumer compliance</p>
          <h1>{overview.title}</h1>
          <p className="hero-copy">
            Export the markdown DPA pack for this buyer organization and review
            the currently routable provider subprocessors for the selected
            environment.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">Role: {overview.actorRole}</span>
          <span className="pill">Environment: {props.environment}</span>
          <a className="pill" href={exportUrl}>
            Download DPA markdown
          </a>
        </div>
      </section>

      <section className="card-grid">
        <article className="card neutral">
          <p className="card-label">Platform subprocessors</p>
          <p className="card-value">{registry.platformSubprocessors.length}</p>
          <p className="card-caption">
            Repo-tracked entries shared across buyer exports.
          </p>
        </article>
        <article className="card success">
          <p className="card-label">Provider subprocessors</p>
          <p className="card-value">{registry.providerSubprocessors.length}</p>
          <p className="card-caption">
            Currently routable provider organizations in {props.environment}.
          </p>
        </article>
        <article className="card warning">
          <p className="card-label">Appendix status</p>
          <p className="card-value" style={{ fontSize: "1.4rem" }}>
            {registry.providerAppendixStatus}
          </p>
          <p className="card-caption">
            DPA version {registry.dpaVersion}, effective {registry.dpaEffectiveDate}.
          </p>
        </article>
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Platform appendix</p>
            <h2>Always-visible platform subprocessors</h2>
          </div>
          <p className="inventory-note">
            Privacy: {registry.privacyEmail} | Security: {registry.securityEmail}
          </p>
        </div>
        <div className="node-table">
          {registry.platformSubprocessors.map((entry) => (
            <article className="node-row" key={entry.vendorName}>
              <div className="trend-copy">
                <strong>{entry.vendorName}</strong>
                <small>{entry.purpose}</small>
              </div>
              <div className="trend-copy">
                <strong>{entry.status}</strong>
                <small>{entry.dataCategories.join(", ")}</small>
              </div>
              <div className="trend-copy">
                <strong>{entry.transferMechanism}</strong>
                <small>{entry.activationCondition ?? "Always active"}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Provider appendix</p>
            <h2>Environment-scoped provider subprocessors</h2>
          </div>
          <p className="inventory-note">
            Export uses the exact list shown here for {props.environment}.
          </p>
        </div>
        {registry.providerAppendixStatus === "none_routable" ? (
          <p className="inventory-note">
            No provider organizations are currently routable in the selected
            environment. The DPA export renders an explicit empty provider
            appendix.
          </p>
        ) : (
          <div className="node-table">
            {registry.providerSubprocessors.map((entry) => (
              <article className="node-row" key={entry.organizationId}>
                <div className="trend-copy">
                  <strong>{entry.organizationName}</strong>
                  <small>
                    {entry.organizationSlug} | {entry.organizationId}
                  </small>
                </div>
                <div className="trend-copy">
                  <strong>{entry.routableNodeCount} routable nodes</strong>
                  <small>
                    {entry.regions.join(", ")} | trust{" "}
                    {entry.trustTierCeiling ?? "unknown"}
                  </small>
                </div>
                <div className="trend-copy">
                  <strong>
                    {entry.hasActiveAttestation
                      ? "active attestation"
                      : "no active attestation"}
                  </strong>
                  <small>
                    {entry.routingAvailable ? "routing available" : "not routable"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
