import { loadDashboardSettings } from "../../src/config/DashboardSettings.js";
import { LoadSubprocessorRegistry } from "../../src/application/compliance/LoadSubprocessorRegistry.js";
import { ControlPlaneDashboardClient } from "../../src/infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import { SubprocessorRegistryScreen } from "../../src/interfaces/react/SubprocessorRegistryScreen.js";

export default async function SubprocessorsPage() {
  const settings = loadDashboardSettings(process.env);
  const loader = new LoadSubprocessorRegistry(
    new ControlPlaneDashboardClient(settings.controlPlaneBaseUrl),
  );
  const registry = await loader.execute();

  return <SubprocessorRegistryScreen initialSnapshot={registry.toSnapshot()} />;
}
