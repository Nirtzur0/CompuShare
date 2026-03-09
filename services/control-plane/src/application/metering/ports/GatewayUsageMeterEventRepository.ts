import type { GatewayUsageMeterEvent } from "../../../domain/metering/GatewayUsageMeterEvent.js";

export interface GatewayUsageMeterEventRepository {
  appendGatewayUsageMeterEvent(event: GatewayUsageMeterEvent): Promise<void>;
}
