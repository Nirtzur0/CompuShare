import React from "react";
import type { ProviderDashboardOverview } from "../../domain/provider/ProviderDashboardOverview.js";

export interface ProviderDashboardScreenProps {
  overview: ProviderDashboardOverview;
  actorUserId: string;
}

function formatDateLabel(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

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

export function ProviderDashboardScreen(props: ProviderDashboardScreenProps) {
  const maxDailyEarningsCents = Math.max(
    ...props.overview.earningsTrend.map((point) =>
      Math.round(Number(point.earningsUsd) * 100),
    ),
    1,
  );
  const maxEstimatedUtilizationPercent = Math.max(
    ...props.overview.estimatedUtilizationTrend.map(
      (point) => point.estimatedUtilizationPercent,
    ),
    1,
  );

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Provider alpha shell</p>
          <h1>{props.overview.title}</h1>
          <p className="hero-copy">
            Real control-plane data only. This shell combines inventory,
            settlement, and metering signals into one provider oversight view.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">Role: {props.overview.actorRole}</span>
          <span className="pill">
            Trust mix: {props.overview.trustMixLabel}
          </span>
        </div>
      </section>

      <section className="card-grid">
        {props.overview.nodeHealthCards.map((card) => (
          <article className="card neutral" key={card.label}>
            <p className="card-label">{card.label}</p>
            <p className="card-value">{card.value}</p>
            <p className="card-caption">{card.emphasis}</p>
          </article>
        ))}
      </section>

      <section className="card-grid">
        {props.overview.balanceCards.map((card) => (
          <article className={cardToneClass(card.tone)} key={card.label}>
            <p className="card-label">{card.label}</p>
            <p className="card-value">${card.valueUsd}</p>
            <p className="card-caption">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Disputes</p>
            <h2>Provider dispute visibility</h2>
          </div>
          <p className="inventory-note">
            Active dispute exposure reduces payout eligibility and recent lost
            disputes reduce placement priority.
          </p>
        </div>
        <div className="card-grid">
          <article className="card warning">
            <p className="card-label">Active disputes</p>
            <p className="card-value">{props.overview.activeDisputeCount}</p>
            <p className="card-caption">
              Hold amount ${props.overview.activeDisputeHoldUsd}
            </p>
          </article>
          <article className="card neutral">
            <p className="card-label">Lost disputes (90d)</p>
            <p className="card-value">
              {props.overview.recentLostDisputeCount90d}
            </p>
            <p className="card-caption">
              Placement penalties apply deterministically from this count.
            </p>
          </article>
          <article className="card neutral">
            <p className="card-label">Workflow</p>
            <p className="card-value">
              <a
                href={`/provider/disputes?organizationId=${props.overview.organizationId}&actorUserId=${props.actorUserId}`}
              >
                Open dispute dashboard
              </a>
            </p>
            <p className="card-caption">
              Review read-only dispute state and payout hold exposure.
            </p>
          </article>
        </div>
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Inventory snapshot</p>
            <h2>Node health and trust mix</h2>
          </div>
          <p className="inventory-note">
            Active node inventory stays explicit so operator teams can compare
            current capacity against the last seven days of earnings and usage.
          </p>
        </div>
        <div className="node-table">
          <div className="node-row node-row-header">
            <span>Node</span>
            <span>Region</span>
            <span>Health</span>
            <span>Trust</span>
            <span>GPU profile</span>
          </div>
          {props.overview.nodes.map((node) => (
            <div className="node-row" key={node.id}>
              <span>
                <strong>{node.label}</strong>
                <small>{node.hostname}</small>
              </span>
              <span>{node.region}</span>
              <span className={`status status-${node.healthState}`}>
                {node.healthState}
              </span>
              <span>{node.trustTier.replaceAll("_", " ")}</span>
              <span>
                {node.gpuCount}x {node.primaryGpuModel}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="trend-grid">
        <article className="inventory-panel trend-panel">
          <div className="inventory-header trend-header">
            <div>
              <p className="eyebrow">Ledger trend</p>
              <h2>Daily earnings</h2>
            </div>
            <p className="inventory-note">
              Provider-payable and reserve-holdback totals over the last seven
              days.
            </p>
          </div>
          <div className="trend-rows">
            {props.overview.earningsTrend.map((point) => (
              <div className="trend-row" key={point.date}>
                <div className="trend-copy">
                  <strong>{formatDateLabel(point.date)}</strong>
                  <small>Reserve ${point.reserveHoldbackUsd}</small>
                </div>
                <div className="trend-bar-track">
                  <span
                    className="trend-bar-fill success-fill"
                    style={{
                      width: `${String(
                        Math.max(
                          (Math.round(Number(point.earningsUsd) * 100) /
                            maxDailyEarningsCents) *
                            100,
                          4,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <span className="trend-value">${point.earningsUsd}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="inventory-panel trend-panel">
          <div className="inventory-header trend-header">
            <div>
              <p className="eyebrow">Metering trend</p>
              <h2>Estimated utilization</h2>
            </div>
            <p className="inventory-note">
              Derived from metered token volume against latest benchmark
              throughput.
            </p>
          </div>
          <div className="trend-rows">
            {props.overview.estimatedUtilizationTrend.map((point) => (
              <div className="trend-row" key={point.date}>
                <div className="trend-copy">
                  <strong>{formatDateLabel(point.date)}</strong>
                  <small>{point.totalTokens.toLocaleString()} tokens</small>
                </div>
                <div className="trend-bar-track">
                  <span
                    className="trend-bar-fill warning-fill"
                    style={{
                      width: `${String(
                        Math.max(
                          (point.estimatedUtilizationPercent /
                            maxEstimatedUtilizationPercent) *
                            100,
                          point.estimatedUtilizationPercent > 0 ? 4 : 0,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <span className="trend-value">
                  {point.estimatedUtilizationPercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
