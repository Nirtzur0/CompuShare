import { loadDashboardSettings } from "../../src/config/DashboardSettings.js";
import { LoadConsumerDashboardOverview } from "../../src/application/consumer/LoadConsumerDashboardOverview.js";
import { ConsumerDashboardScreen } from "../../src/interfaces/react/ConsumerDashboardScreen.js";
import { ControlPlaneDashboardClient } from "../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";

interface ConsumerPageProps {
  searchParams?: Promise<{
    organizationId?: string;
    actorUserId?: string;
  }>;
}

export default async function ConsumerPage(input: ConsumerPageProps) {
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
          <p className="eyebrow">Consumer overview</p>
          <h1>Missing organization context</h1>
          <p className="landing-copy">
            Supply both <code>organizationId</code> and <code>actorUserId</code>{" "}
            query params to load the live consumer shell.
          </p>
        </section>
      </main>
    );
  }

  const settings = loadDashboardSettings(process.env);
  const loader = new LoadConsumerDashboardOverview(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl),
  );
  const overview = await loader.execute({
    organizationId,
    actorUserId,
  });

  return <ConsumerDashboardScreen overview={overview} />;
}
