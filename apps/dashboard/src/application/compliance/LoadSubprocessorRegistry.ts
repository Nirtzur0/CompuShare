import type { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";
import type { SubprocessorRegistry } from "../../domain/compliance/SubprocessorRegistry.js";

export class LoadSubprocessorRegistry {
  public constructor(
    private readonly client: Pick<ControlPlaneDashboardClient, "getSubprocessorRegistry">
  ) {}

  public execute(): Promise<SubprocessorRegistry> {
    return this.client.getSubprocessorRegistry();
  }
}
