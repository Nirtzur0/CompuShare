import type { ConsumerDisputeDashboard } from "../../domain/consumer/ConsumerDisputeDashboard.js";
import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";

export class LoadConsumerDisputeDashboard {
  public constructor(
    private readonly controlPlaneClient: Pick<
      ControlPlaneDashboardClient,
      "getConsumerDisputeDashboard"
    >,
  ) {}

  public execute(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ConsumerDisputeDashboard> {
    return this.controlPlaneClient.getConsumerDisputeDashboard(input);
  }
}
