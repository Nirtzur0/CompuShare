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
    environment: "development" | "staging" | "production";
  }): Promise<ConsumerDashboardOverview> {
    return this.controlPlaneClient.getConsumerDashboardOverview(input);
  }
}
