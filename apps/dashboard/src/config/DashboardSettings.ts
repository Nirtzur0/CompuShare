export interface DashboardSettings {
  controlPlaneBaseUrl: string;
}

export function loadDashboardSettings(
  environment: NodeJS.ProcessEnv,
): DashboardSettings {
  const controlPlaneBaseUrl = environment.CONTROL_PLANE_BASE_URL?.trim();

  if (controlPlaneBaseUrl === undefined || controlPlaneBaseUrl.length === 0) {
    throw new Error("CONTROL_PLANE_BASE_URL is required.");
  }

  return {
    controlPlaneBaseUrl,
  };
}
