import { DomainValidationError } from "../identity/DomainValidationError.js";

export interface ProviderGpuInventorySnapshot {
  model: string;
  vramGb: number;
  count: number;
  interconnect: string | null;
}

export class ProviderGpuInventoryItem {
  private constructor(
    public readonly model: string,
    public readonly vramGb: number,
    public readonly count: number,
    public readonly interconnect: string | null
  ) {}

  public static create(
    input: ProviderGpuInventorySnapshot
  ): ProviderGpuInventoryItem {
    const normalizedModel = input.model.trim();
    const normalizedInterconnect = input.interconnect?.trim() ?? null;

    if (normalizedModel.length < 2 || normalizedModel.length > 120) {
      throw new DomainValidationError(
        "GPU model must be between 2 and 120 characters."
      );
    }

    if (
      !Number.isInteger(input.vramGb) ||
      input.vramGb < 1 ||
      input.vramGb > 4096
    ) {
      throw new DomainValidationError(
        "GPU VRAM must be an integer between 1 and 4096 GB."
      );
    }

    if (
      !Number.isInteger(input.count) ||
      input.count < 1 ||
      input.count > 1024
    ) {
      throw new DomainValidationError(
        "GPU count must be an integer between 1 and 1024."
      );
    }

    return new ProviderGpuInventoryItem(
      normalizedModel,
      input.vramGb,
      input.count,
      normalizedInterconnect
    );
  }

  public toSnapshot(): ProviderGpuInventorySnapshot {
    return {
      model: this.model,
      vramGb: this.vramGb,
      count: this.count,
      interconnect: this.interconnect
    };
  }
}

export class ProviderGpuInventory {
  private constructor(
    public readonly items: readonly ProviderGpuInventoryItem[],
    public readonly driverVersion: string
  ) {}

  public static create(input: {
    driverVersion: string;
    items: readonly ProviderGpuInventorySnapshot[];
  }): ProviderGpuInventory {
    const normalizedDriverVersion = input.driverVersion.trim();

    if (
      normalizedDriverVersion.length < 3 ||
      normalizedDriverVersion.length > 64
    ) {
      throw new DomainValidationError(
        "Driver version must be between 3 and 64 characters."
      );
    }

    if (input.items.length === 0) {
      throw new DomainValidationError(
        "At least one GPU inventory item must be reported."
      );
    }

    return new ProviderGpuInventory(
      input.items.map((item) => ProviderGpuInventoryItem.create(item)),
      normalizedDriverVersion
    );
  }

  public toSnapshot(): {
    driverVersion: string;
    items: ProviderGpuInventorySnapshot[];
  } {
    return {
      driverVersion: this.driverVersion,
      items: this.items.map((item) => item.toSnapshot())
    };
  }
}
