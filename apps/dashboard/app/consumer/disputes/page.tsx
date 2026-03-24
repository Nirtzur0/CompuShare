import { loadDashboardSettings } from "../../../src/config/DashboardSettings.js";
import { LoadConsumerDisputeDashboard } from "../../../src/application/consumer/LoadConsumerDisputeDashboard.js";
import { ControlPlaneDashboardClient } from "../../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import { ConsumerDisputeDashboardScreen } from "../../../src/interfaces/react/ConsumerDisputeDashboardScreen.js";

interface ConsumerDisputesPageProps {
  searchParams?: Promise<{
    organizationId?: string;
    actorUserId?: string;
  }>;
}

export default async function ConsumerDisputesPage(
  input: ConsumerDisputesPageProps,
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
          <p className="eyebrow">Consumer disputes</p>
          <h1>Missing organization context</h1>
          <p className="landing-copy">
            Supply both <code>organizationId</code> and <code>actorUserId</code>{" "}
            query params to load the buyer dispute workflow.
          </p>
        </section>
      </main>
    );
  }

  const settings = loadDashboardSettings(process.env);
  const loader = new LoadConsumerDisputeDashboard(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl),
  );
  const dashboard = await loader.execute({
    organizationId,
    actorUserId,
  });

  return (
    <ConsumerDisputeDashboardScreen
      controlPlaneBaseUrl={settings.controlPlaneBaseUrl}
      organizationId={organizationId}
      actorUserId={actorUserId}
      initialSnapshot={dashboard.toSnapshot()}
    />
  );
}
