export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <p className="eyebrow">CompuShare dashboards</p>
        <h1>Provider and consumer shells</h1>
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
      </section>
    </main>
  );
}
