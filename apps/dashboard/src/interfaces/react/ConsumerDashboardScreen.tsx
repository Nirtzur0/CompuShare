import React from "react";
import type { ConsumerDashboardOverview } from "../../domain/consumer/ConsumerDashboardOverview.js";

export interface ConsumerDashboardScreenProps {
  overview: ConsumerDashboardOverview;
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

export function ConsumerDashboardScreen(props: ConsumerDashboardScreenProps) {
  const maxDailyTokens = Math.max(
    ...props.overview.usageTrend.map((point) => point.totalTokens),
    1,
  );
  const maxLatencyMs = Math.max(
    ...props.overview.latencyByModel.map((point) => point.p95LatencyMs),
    1,
  );

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Consumer alpha shell</p>
          <h1>{props.overview.title}</h1>
          <p className="hero-copy">
            Real ledger and gateway metering data only. This shell keeps spend,
            balance, usage, and latency state visible in one buyer view.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">Role: {props.overview.actorRole}</span>
          <span className="pill">
            Budget state: {props.overview.remainingBudgetLabel}
          </span>
        </div>
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

      <section className="card-grid">
        {props.overview.spendCards.map((card) => (
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
            <p className="eyebrow">Ledger snapshot</p>
            <h2>Spend and balance separation</h2>
          </div>
          <p className="inventory-note">
            Balance and settled spend remain explicit so buyer teams can compare
            prepaid budget against the last seven days of routed usage.
          </p>
        </div>
        <div className="node-table">
          <div className="node-row node-row-header consumer-row-header">
            <span>Measure</span>
            <span>Value</span>
            <span>Meaning</span>
          </div>
          <div className="node-row consumer-row">
            <span>
              <strong>Prepaid balance</strong>
              <small>Current available cash</small>
            </span>
            <span>${props.overview.balanceCards[0]?.valueUsd}</span>
            <span>
              Ready for routed inference without another charge event.
            </span>
          </div>
          <div className="node-row consumer-row">
            <span>
              <strong>Settled spend</strong>
              <small>Posted usage</small>
            </span>
            <span>${props.overview.spendCards[1]?.valueUsd}</span>
            <span>
              Completed jobs already reconciled into the double-entry ledger.
            </span>
          </div>
        </div>
      </section>

      <section className="trend-grid">
        <article className="inventory-panel trend-panel">
          <div className="inventory-header trend-header">
            <div>
              <p className="eyebrow">Metering trend</p>
              <h2>Daily usage</h2>
            </div>
            <p className="inventory-note">
              Successful routed completions and token totals over the last seven
              days.
            </p>
          </div>
          <div className="trend-rows">
            {props.overview.usageTrend.map((point) => (
              <div className="trend-row" key={point.date}>
                <div className="trend-copy">
                  <strong>{formatDateLabel(point.date)}</strong>
                  <small>{point.requestCount} completions</small>
                </div>
                <div className="trend-bar-track">
                  <span
                    className="trend-bar-fill accent-fill"
                    style={{
                      width: `${String(
                        Math.max(
                          (point.totalTokens / maxDailyTokens) * 100,
                          point.totalTokens > 0 ? 4 : 0,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <span className="trend-value">
                  {point.totalTokens.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="inventory-panel trend-panel">
          <div className="inventory-header trend-header">
            <div>
              <p className="eyebrow">Model latency</p>
              <h2>Latency by model</h2>
            </div>
            <p className="inventory-note">
              Average and p95 latency for the current approved chat aliases.
            </p>
          </div>
          <div className="trend-rows">
            {props.overview.latencyByModel.map((point) => (
              <div className="trend-row" key={point.modelAlias}>
                <div className="trend-copy">
                  <strong>{point.modelAlias}</strong>
                  <small>
                    {point.requestCount} completions /{" "}
                    {point.totalTokens.toLocaleString()} tokens
                  </small>
                </div>
                <div className="trend-bar-track">
                  <span
                    className="trend-bar-fill warning-fill"
                    style={{
                      width: `${String(
                        Math.max(
                          (point.p95LatencyMs / maxLatencyMs) * 100,
                          point.p95LatencyMs > 0 ? 4 : 0,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <span className="trend-value">
                  {point.avgLatencyMs.toFixed(0)} /{" "}
                  {point.p95LatencyMs.toFixed(0)} ms
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
