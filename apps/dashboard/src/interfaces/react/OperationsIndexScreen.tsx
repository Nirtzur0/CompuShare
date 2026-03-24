import React from "react";
import {
  createOperationsRunbookCatalog,
  type OperationsRunbookCatalog,
} from "../../domain/operations/OperationsRunbookCatalog.js";

export interface OperationsIndexScreenProps {
  initialCatalog?: OperationsRunbookCatalog;
}

export function OperationsIndexScreen(props: OperationsIndexScreenProps) {
  const catalog = props.initialCatalog ?? createOperationsRunbookCatalog();
  const coveredReleaseGates = Array.from(
    new Set(catalog.entries.flatMap((entry) => entry.coveredReleaseGates)),
  );

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Operations index</p>
          <h1>{catalog.title}</h1>
          <p className="hero-copy">{catalog.summary}</p>
        </div>
        <div className="hero-meta">
          <span className="pill">Runbooks: {catalog.entries.length}</span>
          <span className="pill">
            Release gates: {coveredReleaseGates.length}
          </span>
          <span className="pill">Public index</span>
        </div>
      </section>

      <section className="card-grid">
        {coveredReleaseGates.map((gate) => (
          <article className="card neutral" key={gate}>
            <p className="card-label">Covered release gate</p>
            <p className="card-value operations-card-value">{gate}</p>
            <p className="card-caption">
              Repository evidence comes from the linked canonical runbook.
            </p>
          </article>
        ))}
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Canonical source</p>
            <h2>Repo-tracked operational runbooks</h2>
          </div>
          <p className="inventory-note">
            This page is an index only. The markdown documents under{" "}
            <code>docs/runbooks/</code> remain the authoritative source.
          </p>
        </div>

        <div className="dispute-list">
          {catalog.entries.map((entry) => (
            <article className="dispute-card" key={entry.slug}>
              <div className="dispute-card-header">
                <div>
                  <p className="eyebrow">{entry.slug.replaceAll("-", " ")}</p>
                  <h3>{entry.title}</h3>
                </div>
                <span className="status status-open">Canonical</span>
              </div>
              <p className="inventory-note">{entry.summary}</p>
              <div className="card-grid">
                <article className="card neutral">
                  <p className="card-label">Markdown source</p>
                  <p className="card-value operations-card-value">
                    <code>{entry.canonicalDocumentPath}</code>
                  </p>
                  <p className="card-caption">
                    Repo-tracked source of truth for this runbook.
                  </p>
                </article>
                <article className="card warning">
                  <p className="card-label">Release gates</p>
                  <p className="card-value operations-card-value">
                    {entry.coveredReleaseGates.join(", ")}
                  </p>
                  <p className="card-caption">
                    Gates that can be closed directly from repository evidence.
                  </p>
                </article>
              </div>
              <div className="operations-surface-list">
                {entry.coveredSurfaces.map((surface) => (
                  <span className="pill" key={surface}>
                    {surface}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
