import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import type { PrivateConnectorDashboard } from "../../domain/consumer/PrivateConnectorDashboard.js";

export class LoadPrivateConnectorDashboard {
  public constructor(
    private readonly client: Pick<
      ControlPlaneDashboardClient,
      "getPrivateConnectorDashboard"
    >,
  ) {}

  public execute(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<PrivateConnectorDashboard> {
    return this.client.getPrivateConnectorDashboard(input);
  }
}
