import { loadDashboardSettings } from "../../src/config/DashboardSettings.js";
import { LoadProviderDashboardOverview } from "../../src/application/provider/LoadProviderDashboardOverview.js";
import { ProviderDashboardScreen } from "../../src/interfaces/react/ProviderDashboardScreen.js";
import { ControlPlaneDashboardClient } from "../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";

interface ProviderPageProps {
  searchParams?: Promise<{
    organizationId?: string;
    actorUserId?: string;
  }>;
}

export default async function ProviderPage(input: ProviderPageProps) {
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
          <p className="eyebrow">Provider overview</p>
          <h1>Missing organization context</h1>
          <p className="landing-copy">
            Supply both <code>organizationId</code> and <code>actorUserId</code>{" "}
            query params to load the live provider shell.
          </p>
        </section>
      </main>
    );
  }

  const settings = loadDashboardSettings(process.env);
  const loader = new LoadProviderDashboardOverview(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl),
  );
  const overview = await loader.execute({
    organizationId,
    actorUserId,
  });

  return <ProviderDashboardScreen overview={overview} />;
}
