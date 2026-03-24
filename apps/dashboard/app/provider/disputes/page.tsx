import { loadDashboardSettings } from "../../../src/config/DashboardSettings.js";
import { LoadProviderDisputeDashboard } from "../../../src/application/provider/LoadProviderDisputeDashboard.js";
import { ControlPlaneDashboardClient } from "../../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import { ProviderDisputeDashboardScreen } from "../../../src/interfaces/react/ProviderDisputeDashboardScreen.js";

interface ProviderDisputesPageProps {
  searchParams?: Promise<{
    organizationId?: string;
    actorUserId?: string;
  }>;
}

export default async function ProviderDisputesPage(
  input: ProviderDisputesPageProps,
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
          <p className="eyebrow">Provider disputes</p>
          <h1>Missing organization context</h1>
          <p className="landing-copy">
            Supply both <code>organizationId</code> and <code>actorUserId</code>{" "}
            query params to load the provider dispute view.
          </p>
        </section>
      </main>
    );
  }

  const settings = loadDashboardSettings(process.env);
  const loader = new LoadProviderDisputeDashboard(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl),
  );
  const dashboard = await loader.execute({
    organizationId,
    actorUserId,
  });

  return <ProviderDisputeDashboardScreen dashboard={dashboard} />;
}
