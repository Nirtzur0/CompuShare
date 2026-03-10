import { loadDashboardSettings } from "../../../src/config/DashboardSettings.js";
import { LoadProviderPricingSimulator } from "../../../src/application/provider/LoadProviderPricingSimulator.js";
import { ControlPlaneDashboardClient } from "../../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import { ProviderPricingSimulatorScreen } from "../../../src/interfaces/react/ProviderPricingSimulatorScreen.js";

interface ProviderPricingPageProps {
  searchParams?: Promise<{
    organizationId?: string;
    actorUserId?: string;
  }>;
}

export default async function ProviderPricingPage(
  input: ProviderPricingPageProps
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
          <p className="eyebrow">Provider pricing</p>
          <h1>Missing organization context</h1>
          <p className="landing-copy">
            Supply both <code>organizationId</code> and <code>actorUserId</code>{" "}
            query params to load the live provider pricing simulator.
          </p>
        </section>
      </main>
    );
  }

  const settings = loadDashboardSettings(process.env);
  const loader = new LoadProviderPricingSimulator(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl)
  );
  const simulator = await loader.execute({
    organizationId,
    actorUserId
  });

  return <ProviderPricingSimulatorScreen snapshot={simulator.toSnapshot()} />;
}
