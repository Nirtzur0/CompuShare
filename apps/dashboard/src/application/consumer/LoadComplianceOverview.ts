import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import type { ComplianceOverview } from "../../domain/consumer/ComplianceOverview.js";

export class LoadComplianceOverview {
  public constructor(
    private readonly client: Pick<ControlPlaneDashboardClient, "getComplianceOverview">
  ) {}

  public execute(input: {
    organizationId: string;
    actorUserId: string;
    environment: "development" | "staging" | "production";
  }): Promise<ComplianceOverview> {
    return this.client.getComplianceOverview(input);
  }
}
