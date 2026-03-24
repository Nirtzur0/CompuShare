import type { ProviderDisputeDashboard } from "../../domain/provider/ProviderDisputeDashboard.js";
import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";

export class LoadProviderDisputeDashboard {
  public constructor(
    private readonly controlPlaneClient: Pick<
      ControlPlaneDashboardClient,
      "getProviderDisputeDashboard"
    >,
  ) {}

  public execute(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ProviderDisputeDashboard> {
    return this.controlPlaneClient.getProviderDisputeDashboard(input);
  }
}
