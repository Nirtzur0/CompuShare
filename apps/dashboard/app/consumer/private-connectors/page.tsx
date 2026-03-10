import { loadDashboardSettings } from "../../../src/config/DashboardSettings.js";
import { LoadPrivateConnectorDashboard } from "../../../src/application/consumer/LoadPrivateConnectorDashboard.js";
import { ControlPlaneDashboardClient } from "../../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import { PrivateConnectorDashboardScreen } from "../../../src/interfaces/react/PrivateConnectorDashboardScreen.js";

interface PrivateConnectorPageProps {
  searchParams?: Promise<{
    organizationId?: string;
    actorUserId?: string;
  }>;
}

export default async function PrivateConnectorPage(
  input: PrivateConnectorPageProps,
) {
  const searchParams = input.searchParams ? await input.searchParams : {};
  const organizationId = searchParams.organizationId?.trim();
  const actorUserId = searchParams.actorUserId?.trim();

  if (
    organizationId === undefined ||
    organizationId.length === 0 ||
    actorUserId === undefined ||
    actorUserId.length === 0
  ) {
    return (
      <main className="landing-shell">
        <section className="landing-panel">
          <p className="eyebrow">Private connectors</p>
          <h1>Missing organization context</h1>
          <p className="landing-copy">
            Supply both <code>organizationId</code> and <code>actorUserId</code>{" "}
            query params to load the buyer private connector dashboard.
          </p>
        </section>
      </main>
    );
  }

  const settings = loadDashboardSettings(process.env);
  const loader = new LoadPrivateConnectorDashboard(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl),
  );
  const dashboard = await loader.execute({
    organizationId,
    actorUserId,
  });

  return (
    <PrivateConnectorDashboardScreen
      controlPlaneBaseUrl={settings.controlPlaneBaseUrl}
      organizationId={organizationId}
      actorUserId={actorUserId}
      initialSnapshot={dashboard.toSnapshot()}
    />
  );
}
