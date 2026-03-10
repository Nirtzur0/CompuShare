"use client";

import React, { useState } from "react";
import {
  ProviderPricingSimulator,
  type ProviderPricingSimulatorNodeSnapshot,
  type ProviderPricingSimulatorSnapshot,
} from "../../domain/provider/ProviderPricingSimulator.js";
import { ProviderPricingScenario } from "../../domain/provider/ProviderPricingScenario.js";

export interface ProviderPricingSimulatorScreenProps {
  snapshot: ProviderPricingSimulatorSnapshot;
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "History required";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "Unavailable";
  }

  return `${value.toFixed(2)}%`;
}

function formatUnavailableReason(
  reason: ProviderPricingSimulatorNodeSnapshot["unavailableReason"],
): string {
  switch (reason) {
    case "missing_routing_profile":
      return "Routing profile missing";
    case "missing_benchmark":
      return "Benchmark missing";
    case "missing_routing_profile_and_benchmark":
      return "Routing profile and benchmark missing";
    case null:
      return "Ready";
  }
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

export function ProviderPricingSimulatorScreen(
  props: ProviderPricingSimulatorScreenProps,
) {
  const simulator = ProviderPricingSimulator.create(props.snapshot);
  const [scenarioSnapshot, setScenarioSnapshot] = useState(() =>
    ProviderPricingScenario.createDefault(simulator).toSnapshot(),
  );
  const scenario = ProviderPricingScenario.create(scenarioSnapshot);
  const projection = scenario.calculate(simulator);

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Provider pricing</p>
          <h1>{simulator.title}</h1>
          <p className="hero-copy">
            Baselines come from real routing, benchmark, metering, and
            settlement history. Scenario edits stay local to this browser
            session and never mutate live provider pricing.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">Role: {simulator.actorRole}</span>
          <span className="pill">
            Window: {simulator.assumptions.usageObservationDays}d usage /{" "}
            {simulator.assumptions.settlementEconomicsDays}d settlement
          </span>
          <span className="pill">
            Projection: {simulator.assumptions.projectionDays} days
          </span>
        </div>
      </section>

      <section className="card-grid">
        <article className={cardToneClass("success")}>
          <p className="card-label">Baseline monthly withdrawable</p>
          <p className="card-value">
            {formatCurrency(projection.summary.baselineMonthlyWithdrawableUsd)}
          </p>
          <p className="card-caption">
            Realized withdrawable ratio across{" "}
            {simulator.assumptions.settlementCount} settlement
            {simulator.assumptions.settlementCount === 1 ? "" : "s"}.
          </p>
        </article>
        <article className={cardToneClass("neutral")}>
          <p className="card-label">Scenario monthly withdrawable</p>
          <p className="card-value">
            {formatCurrency(projection.summary.scenarioMonthlyWithdrawableUsd)}
          </p>
          <p className="card-caption">
            Net projection only appears when settlement history exists.
          </p>
        </article>
        <article className={cardToneClass("warning")}>
          <p className="card-label">Monthly delta</p>
          <p className="card-value">
            {formatCurrency(projection.summary.monthlyDeltaUsd)}
          </p>
          <p className="card-caption">
            {projection.summary.simulatableNodeCount} simulatable node
            {projection.summary.simulatableNodeCount === 1 ? "" : "s"}.
          </p>
        </article>
      </section>

      <section className="card-grid">
        <article className={cardToneClass("neutral")}>
          <p className="card-label">Simulatable nodes</p>
          <p className="card-value">{simulator.simulatableNodeCount}</p>
          <p className="card-caption">
            Nodes with both a routing floor and a benchmark baseline.
          </p>
        </article>
        <article className={cardToneClass("neutral")}>
          <p className="card-label">Platform fee rate</p>
          <p className="card-value">
            {formatPercent(simulator.assumptions.realizedPlatformFeePercent)}
          </p>
          <p className="card-caption">
            Derived from realized provider-org settlement history.
          </p>
        </article>
        <article className={cardToneClass("neutral")}>
          <p className="card-label">Reserve holdback rate</p>
          <p className="card-value">
            {formatPercent(
              simulator.assumptions.realizedReserveHoldbackPercent,
            )}
          </p>
          <p className="card-caption">
            History stays explicit. No guessed reserve defaults.
          </p>
        </article>
      </section>

      {simulator.assumptions.netProjectionStatus === "history_required" ? (
        <section className="inventory-panel pricing-history-note">
          <p className="eyebrow">History required</p>
          <h2>Gross projections are available, net projections are not.</h2>
          <p className="inventory-note">
            This provider organization has no realized settlement history in the
            last {simulator.assumptions.settlementEconomicsDays} days, so the
            simulator shows gross monthly output only until real settlement mix
            exists.
          </p>
        </section>
      ) : null}

      <section className="pricing-node-grid">
        {projection.nodes.map((row) => (
          <article className="inventory-panel pricing-node-card" key={row.node.id}>
            <div className="inventory-header pricing-node-header">
              <div>
                <p className="eyebrow">Node scenario</p>
                <h2>{row.node.label}</h2>
                <p className="inventory-note">
                  {row.node.region} · {row.node.gpuCount}x{" "}
                  {row.node.primaryGpuModel} · {row.node.hostname}
                </p>
              </div>
              <div className="pricing-node-meta">
                <span className={`status status-${row.node.healthState}`}>
                  {row.node.healthState}
                </span>
                <span className="pill">
                  {row.node.trustTier.replaceAll("_", " ")}
                </span>
              </div>
            </div>

            <div className="pricing-baseline-grid">
              <div>
                <p className="card-label">Current floor</p>
                <p className="pricing-metric">
                  {row.node.currentPriceFloorUsdPerHour === null
                    ? "Unavailable"
                    : formatCurrency(row.node.currentPriceFloorUsdPerHour)}
                  <small>/ hour</small>
                </p>
              </div>
              <div>
                <p className="card-label">Observed utilization</p>
                <p className="pricing-metric">
                  {formatPercent(row.node.observedUtilizationPercent)}
                </p>
              </div>
              <div>
                <p className="card-label">Observed 7-day volume</p>
                <p className="pricing-metric">
                  {row.node.observed7dTotalTokens.toLocaleString()} <small>tokens</small>
                </p>
              </div>
              <div>
                <p className="card-label">Throughput baseline</p>
                <p className="pricing-metric">
                  {row.node.throughputTokensPerSecond === null
                    ? "Unavailable"
                    : `${row.node.throughputTokensPerSecond.toLocaleString()} tok/s`}
                </p>
              </div>
            </div>

            {row.node.simulationStatus === "unavailable" || row.scenario === null ? (
              <div className="pricing-unavailable">
                <p className="card-label">Simulator status</p>
                <p className="pricing-unavailable-copy">
                  {formatUnavailableReason(row.node.unavailableReason)}
                </p>
                <p className="card-caption">
                  This node stays out of the pricing what-if model until the
                  missing baseline is present.
                </p>
              </div>
            ) : (
              <>
                <div className="pricing-input-grid">
                  <label className="pricing-input">
                    <span className="card-label">Scenario floor</span>
                    <input
                      aria-label={`Scenario floor for ${row.node.label}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.scenario.proposedPriceFloorUsdPerHour}
                      onChange={(event) => {
                        const nextValue = Number(event.currentTarget.value);

                        if (!Number.isFinite(nextValue)) {
                          return;
                        }

                        setScenarioSnapshot((current) =>
                          ProviderPricingScenario.create(current)
                            .withNodeInput(row.node.id, {
                              proposedPriceFloorUsdPerHour: nextValue,
                            })
                            .toSnapshot(),
                        );
                      }}
                    />
                  </label>

                  <label className="pricing-input">
                    <span className="card-label">Target utilization</span>
                    <input
                      aria-label={`Target utilization for ${row.node.label}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={row.scenario.targetUtilizationPercent}
                      onChange={(event) => {
                        const nextValue = Number(event.currentTarget.value);

                        if (!Number.isFinite(nextValue)) {
                          return;
                        }

                        setScenarioSnapshot((current) =>
                          ProviderPricingScenario.create(current)
                            .withNodeInput(row.node.id, {
                              targetUtilizationPercent: nextValue,
                            })
                            .toSnapshot(),
                        );
                      }}
                    />
                  </label>
                </div>

                <div className="pricing-comparison-grid">
                  <div className="pricing-comparison-column">
                    <p className="card-label">Baseline gross</p>
                    <p className="pricing-metric">
                      {formatCurrency(row.baselineMonthlyGrossUsd)}
                    </p>
                    <p className="card-caption">
                      Withdrawable:{" "}
                      {formatCurrency(row.baselineProjectedWithdrawableUsd)}
                    </p>
                    <p className="card-caption">
                      Platform fee: {formatCurrency(row.baselinePlatformFeeUsd)}
                    </p>
                    <p className="card-caption">
                      Reserve holdback:{" "}
                      {formatCurrency(row.baselineReserveHoldbackUsd)}
                    </p>
                  </div>
                  <div className="pricing-comparison-column">
                    <p className="card-label">Scenario gross</p>
                    <p className="pricing-metric">
                      {formatCurrency(row.scenarioMonthlyGrossUsd)}
                    </p>
                    <p className="card-caption">
                      Withdrawable:{" "}
                      {formatCurrency(row.scenarioProjectedWithdrawableUsd)}
                    </p>
                    <p className="card-caption">
                      Platform fee: {formatCurrency(row.scenarioPlatformFeeUsd)}
                    </p>
                    <p className="card-caption">
                      Reserve holdback:{" "}
                      {formatCurrency(row.scenarioReserveHoldbackUsd)}
                    </p>
                  </div>
                  <div className="pricing-comparison-column delta-column">
                    <p className="card-label">Delta</p>
                    <p className="pricing-metric">
                      {formatCurrency(row.withdrawableDeltaUsd)}
                    </p>
                    <p className="card-caption">
                      Gross delta: {formatCurrency(row.grossDeltaUsd)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
