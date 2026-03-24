import { loadDashboardSettings } from "../../../src/config/DashboardSettings.js";
import { LoadComplianceOverview } from "../../../src/application/consumer/LoadComplianceOverview.js";
import { ControlPlaneDashboardClient } from "../../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import { ComplianceOverviewScreen } from "../../../src/interfaces/react/ComplianceOverviewScreen.js";

interface CompliancePageProps {
  searchParams?: Promise<{
    organizationId?: string;
    actorUserId?: string;
    environment?: string;
  }>;
}

export default async function CompliancePage(input: CompliancePageProps) {
  const searchParams = input.searchParams ? await input.searchParams : {};
  const organizationId = searchParams.organizationId?.trim();
  const actorUserId = searchParams.actorUserId?.trim();
  const environment = searchParams.environment?.trim();

  if (
    organizationId === undefined ||
    organizationId.length === 0 ||
    actorUserId === undefined ||
    actorUserId.length === 0 ||
    (environment !== "development" &&
      environment !== "staging" &&
      environment !== "production")
  ) {
    return (
      <main className="landing-shell">
        <section className="landing-panel">
          <p className="eyebrow">Compliance overview</p>
          <h1>Missing organization context</h1>
          <p className="landing-copy">
            Supply <code>organizationId</code>, <code>actorUserId</code>, and{" "}
            <code>environment</code> query params to load the buyer compliance
            view.
          </p>
        </section>
      </main>
    );
  }

  const settings = loadDashboardSettings(process.env);
  const loader = new LoadComplianceOverview(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl),
  );
  const overview = await loader.execute({
    organizationId,
    actorUserId,
    environment,
  });

  return (
    <ComplianceOverviewScreen
      controlPlaneBaseUrl={settings.controlPlaneBaseUrl}
      organizationId={organizationId}
      actorUserId={actorUserId}
      environment={environment}
      initialSnapshot={overview.toSnapshot()}
    />
  );
}
