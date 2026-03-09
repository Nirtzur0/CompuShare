import { DomainValidationError } from "../identity/DomainValidationError.js";
import { ProviderPriceFloorUsdPerHour } from "../provider/ProviderPriceFloorUsdPerHour.js";
import type { ProviderGpuInventorySnapshot } from "../provider/ProviderGpuInventory.js";
import type { ProviderInventorySummary } from "../provider/ProviderInventorySummary.js";
import { ProviderRegion } from "../provider/ProviderRegion.js";
import {
  type ProviderTrustTier,
  parseProviderTrustTier,
  providerTrustTierMeetsMinimum
} from "../provider/ProviderTrustTier.js";

export interface PlacementRequirementsSnapshot {
  gpuClass: string;
  minVramGb: number;
  region: string;
  minimumTrustTier: string;
  maxPriceUsdPerHour: number;
}

export class PlacementRequirements {
  private constructor(
    public readonly gpuClass: string,
    public readonly minVramGb: number,
    public readonly region: ProviderRegion,
    public readonly minimumTrustTier: ProviderTrustTier,
    public readonly maxPriceUsdPerHour: ProviderPriceFloorUsdPerHour
  ) {}

  public static create(
    input: PlacementRequirementsSnapshot
  ): PlacementRequirements {
    return new PlacementRequirements(
      this.normalizeGpuClass(input.gpuClass),
      this.validateMinimumVramGb(input.minVramGb),
      ProviderRegion.create(input.region),
      parseProviderTrustTier(input.minimumTrustTier),
      ProviderPriceFloorUsdPerHour.create(input.maxPriceUsdPerHour)
    );
  }

  public match(
    summary: ProviderInventorySummary
  ): ProviderGpuInventorySnapshot | null {
    if (summary.node.region.value !== this.region.value) {
      return null;
    }

    if (
      !providerTrustTierMeetsMinimum(
        summary.node.trustTier,
        this.minimumTrustTier
      )
    ) {
      return null;
    }

    const routingProfile = summary.node.routingProfile;

    if (
      routingProfile === null ||
      routingProfile.priceFloorUsdPerHour.value > this.maxPriceUsdPerHour.value
    ) {
      return null;
    }

    for (const gpu of summary.node.inventory.items) {
      if (gpu.model.trim().toLowerCase() !== this.gpuClass) {
        continue;
      }

      if (gpu.vramGb < this.minVramGb) {
        continue;
      }

      return gpu.toSnapshot();
    }

    return null;
  }

  public toSnapshot(): PlacementRequirementsSnapshot {
    return {
      gpuClass: this.gpuClass,
      minVramGb: this.minVramGb,
      region: this.region.value,
      minimumTrustTier: this.minimumTrustTier,
      maxPriceUsdPerHour: this.maxPriceUsdPerHour.value
    };
  }

  private static normalizeGpuClass(rawValue: string): string {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 2 || normalizedValue.length > 120) {
      throw new DomainValidationError(
        "GPU class must be between 2 and 120 characters."
      );
    }

    return normalizedValue.toLowerCase();
  }

  private static validateMinimumVramGb(rawValue: number): number {
    if (!Number.isInteger(rawValue) || rawValue < 1 || rawValue > 4096) {
      throw new DomainValidationError(
        "Minimum VRAM must be an integer between 1 and 4096 GB."
      );
    }

    return rawValue;
  }
}
