import type { ProviderPricingSimulator } from "../../domain/provider/ProviderPricingSimulator.js";
import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";

export class LoadProviderPricingSimulator {
  public constructor(
    private readonly controlPlaneClient: Pick<
      ControlPlaneDashboardClient,
      "getProviderPricingSimulator"
    >
  ) {}

  public execute(input: {
    organizationId: string;
    actorUserId: string;
  }): Promise<ProviderPricingSimulator> {
    return this.controlPlaneClient.getProviderPricingSimulator(input);
  }
}
