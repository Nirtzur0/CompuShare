import { ProviderEndpointUrl } from "./ProviderEndpointUrl.js";
import { ProviderNodeId } from "./ProviderNodeId.js";
import { ProviderPriceFloorUsdPerHour } from "./ProviderPriceFloorUsdPerHour.js";

export interface ProviderNodeRoutingProfileSnapshot {
  providerNodeId: string;
  endpointUrl: string;
  priceFloorUsdPerHour: number;
  updatedAt: string;
}

export class ProviderNodeRoutingProfile {
  private constructor(
    public readonly providerNodeId: ProviderNodeId,
    public readonly endpointUrl: ProviderEndpointUrl,
    public readonly priceFloorUsdPerHour: ProviderPriceFloorUsdPerHour,
    public readonly updatedAt: Date
  ) {}

  public static configure(input: {
    providerNodeId: string;
    endpointUrl: string;
    priceFloorUsdPerHour: number;
    updatedAt: Date;
  }): ProviderNodeRoutingProfile {
    return new ProviderNodeRoutingProfile(
      ProviderNodeId.create(input.providerNodeId),
      ProviderEndpointUrl.create(input.endpointUrl),
      ProviderPriceFloorUsdPerHour.create(input.priceFloorUsdPerHour),
      input.updatedAt
    );
  }

  public static rehydrate(input: {
    providerNodeId: string;
    endpointUrl: string;
    priceFloorUsdPerHour: number;
    updatedAt: Date;
  }): ProviderNodeRoutingProfile {
    return new ProviderNodeRoutingProfile(
      ProviderNodeId.create(input.providerNodeId),
      ProviderEndpointUrl.create(input.endpointUrl),
      ProviderPriceFloorUsdPerHour.create(input.priceFloorUsdPerHour),
      input.updatedAt
    );
  }

  public toSnapshot(): ProviderNodeRoutingProfileSnapshot {
    return {
      providerNodeId: this.providerNodeId.value,
      endpointUrl: this.endpointUrl.value,
      priceFloorUsdPerHour: this.priceFloorUsdPerHour.value,
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
