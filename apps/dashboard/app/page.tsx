import React from "react";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <p className="eyebrow">CompuShare dashboards</p>
        <h1>Provider, consumer, and launch operations surfaces</h1>
        <p className="landing-copy">
          Open a live shell with a real organization and actor context:
          <code>
            /provider?organizationId=&lt;org-uuid&gt;&amp;actorUserId=&lt;user-uuid&gt;
          </code>
          <br />
          <code>
            /consumer?organizationId=&lt;org-uuid&gt;&amp;actorUserId=&lt;user-uuid&gt;
          </code>
        </p>
        <div className="landing-link-grid">
          <a className="landing-link-card" href="/operations">
            <strong>Operations index</strong>
            <span>Canonical launch runbooks and covered release gates.</span>
          </a>
          <a className="landing-link-card" href="/subprocessors">
            <strong>Subprocessors</strong>
            <span>Public compliance transparency and DPA metadata.</span>
          </a>
        </div>
      </section>
    </main>
  );
}
