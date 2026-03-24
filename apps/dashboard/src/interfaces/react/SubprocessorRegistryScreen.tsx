import React from "react";
import {
  SubprocessorRegistry,
  type SubprocessorRegistrySnapshot,
} from "../../domain/compliance/SubprocessorRegistry.js";

export interface SubprocessorRegistryScreenProps {
  initialSnapshot: SubprocessorRegistrySnapshot;
}

export function SubprocessorRegistryScreen(
  props: SubprocessorRegistryScreenProps,
) {
  const registry = SubprocessorRegistry.create(props.initialSnapshot);

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Public transparency</p>
          <h1>{registry.title}</h1>
          <p className="hero-copy">
            This page lists platform-level subprocessors that may process
            customer data. Buyer-specific provider subprocessors are shown only
            inside authenticated compliance views and DPA exports.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">DPA {registry.dpaVersion}</span>
          <span className="pill">Effective {registry.dpaEffectiveDate}</span>
          <span className="pill">Privacy: {registry.privacyEmail}</span>
        </div>
      </section>

      <section className="card-grid">
        <article className="card neutral">
          <p className="card-label">Platform subprocessors</p>
          <p className="card-value">{registry.platformSubprocessors.length}</p>
          <p className="card-caption">Stable public registry entries.</p>
        </article>
        <article className="card warning">
          <p className="card-label">Provider appendix</p>
          <p className="card-value">Buyer scoped</p>
          <p className="card-caption">
            Provider subprocessors depend on active routable supply in a chosen
            environment.
          </p>
        </article>
        <article className="card success">
          <p className="card-label">Security contact</p>
          <p className="card-value" style={{ fontSize: "1.3rem" }}>
            {registry.securityEmail}
          </p>
          <p className="card-caption">
            Contact for security reviews and subprocessors questions.
          </p>
        </article>
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Platform subprocessors</p>
            <h2>Current registry</h2>
          </div>
          <p className="inventory-note">
            Ordered deterministically from the repo-tracked registry.
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
                <small>
                  {entry.dataCategories.join(", ")} | {entry.regions.join(", ")}
                </small>
              </div>
              <div className="trend-copy">
                <strong>{entry.transferMechanism}</strong>
                <small>
                  {entry.activationCondition ?? "Always active"} | reviewed{" "}
                  {entry.lastReviewedAt}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
