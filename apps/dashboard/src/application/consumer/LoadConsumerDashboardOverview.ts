import type { ConsumerDashboardOverview } from "../../domain/consumer/ConsumerDashboardOverview.js";
import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";

export class LoadConsumerDashboardOverview {
  public constructor(
    private readonly controlPlaneClient: Pick<
      ControlPlaneDashboardClient,
      "getConsumerDashboardOverview"
    >,
  ) {}

  public execute(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ConsumerDashboardOverview> {
    return this.controlPlaneClient.getConsumerDashboardOverview(input);
  }
}
