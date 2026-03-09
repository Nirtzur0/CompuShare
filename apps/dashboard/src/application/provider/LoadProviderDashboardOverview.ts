import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import type { ProviderDashboardOverview } from "../../domain/provider/ProviderDashboardOverview.js";

export class LoadProviderDashboardOverview {
  public constructor(
    private readonly controlPlaneClient: Pick<
      ControlPlaneDashboardClient,
      "getProviderDashboardOverview"
    >,
  ) {}

  public execute(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ProviderDashboardOverview> {
    return this.controlPlaneClient.getProviderDashboardOverview(input);
  }
}
