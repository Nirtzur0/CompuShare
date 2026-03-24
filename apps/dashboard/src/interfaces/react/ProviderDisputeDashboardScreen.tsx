import React from "react";
import type { ProviderDisputeDashboard } from "../../domain/provider/ProviderDisputeDashboard.js";

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "Not resolved";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export interface ProviderDisputeDashboardScreenProps {
  dashboard: ProviderDisputeDashboard;
}

export function ProviderDisputeDashboardScreen(
  props: ProviderDisputeDashboardScreenProps,
) {
  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Provider disputes</p>
          <h1>{props.dashboard.title}</h1>
          <p className="hero-copy">
            This is read-only provider visibility. Active dispute exposure
            reduces payout eligibility, and recent lost disputes affect
            placement priority.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">Role: {props.dashboard.actorRole}</span>
          <span className="pill">
            Active disputes: {props.dashboard.activeDisputeCount}
          </span>
          <span className="pill">
            Hold: ${props.dashboard.activeDisputeHoldUsd}
          </span>
        </div>
      </section>

      <section className="card-grid">
        <article className="card warning">
          <p className="card-label">Active dispute hold</p>
          <p className="card-value">${props.dashboard.activeDisputeHoldUsd}</p>
          <p className="card-caption">
            Deducted from payout eligibility until disputes are cleared.
          </p>
        </article>
        <article className="card neutral">
          <p className="card-label">Lost disputes (90d)</p>
          <p className="card-value">
            {props.dashboard.recentLostDisputeCount90d}
          </p>
          <p className="card-caption">
            Placement penalty multiplier comes from this trailing count.
          </p>
        </article>
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Dispute ledger-adjacent register</p>
            <h2>Allocated provider disputes</h2>
          </div>
          <p className="inventory-note">
            Buyer finance owns dispute creation and status changes. Providers
            get explicit visibility into source, amount, and hold exposure.
          </p>
        </div>

        <div className="dispute-list">
          {props.dashboard.disputes.map((dispute) => (
            <article className="dispute-card" key={dispute.id}>
              <div className="dispute-card-header">
                <div>
                  <p className="eyebrow">
                    {dispute.disputeType} · {dispute.source}
                  </p>
                  <h3>{dispute.reasonCode}</h3>
                </div>
                <span className={`status status-${dispute.status}`}>
                  {dispute.status}
                </span>
              </div>
              <p className="inventory-note">{dispute.summary}</p>
              <div className="card-grid">
                <article className="card neutral">
                  <p className="card-label">Reference</p>
                  <p className="card-value">
                    {dispute.paymentReference ?? dispute.jobReference ?? "N/A"}
                  </p>
                  <p className="card-caption">
                    Chargeback payment or settlement job reference.
                  </p>
                </article>
                <article className="card warning">
                  <p className="card-label">Allocated hold</p>
                  <p className="card-value">${dispute.activeHoldUsd}</p>
                  <p className="card-caption">
                    Disputed ${dispute.disputedAmountUsd}; allocated $
                    {dispute.allocatedAmountUsd}
                  </p>
                </article>
              </div>
              <div className="dispute-metadata-grid">
                <div>
                  <strong>Stripe</strong>
                  <ul>
                    <li>Dispute ID: {dispute.stripeDisputeId ?? "N/A"}</li>
                    <li>Charge ID: {dispute.stripeChargeId ?? "N/A"}</li>
                    <li>Reason: {dispute.stripeReason ?? "N/A"}</li>
                    <li>Status: {dispute.stripeStatus ?? "N/A"}</li>
                  </ul>
                </div>
                <div>
                  <strong>Timestamps</strong>
                  <ul>
                    <li>Created: {formatDateTime(dispute.createdAt)}</li>
                    <li>Updated: {formatDateTime(dispute.updatedAt)}</li>
                    <li>Resolved: {formatDateTime(dispute.resolvedAt)}</li>
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
