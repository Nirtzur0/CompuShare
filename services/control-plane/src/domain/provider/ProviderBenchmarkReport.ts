import { DomainValidationError } from "../identity/DomainValidationError.js";
import { ProviderBenchmarkId } from "./ProviderBenchmarkId.js";
import { ProviderGpuClass } from "./ProviderGpuClass.js";
import { ProviderNodeId } from "./ProviderNodeId.js";
import { ProviderThroughputBaseline } from "./ProviderThroughputBaseline.js";

export interface ProviderBenchmarkReportSnapshot {
  id: string;
  providerNodeId: string;
  gpuClass: string;
  vramGb: number;
  throughputTokensPerSecond: number;
  driverVersion: string;
  recordedAt: string;
}

export class ProviderBenchmarkReport {
  private constructor(
    public readonly id: ProviderBenchmarkId,
    public readonly providerNodeId: ProviderNodeId,
    public readonly gpuClass: ProviderGpuClass,
    public readonly vramGb: number,
    public readonly throughputTokensPerSecond: ProviderThroughputBaseline,
    public readonly driverVersion: string,
    public readonly recordedAt: Date
  ) {}

  public static record(input: {
    providerNodeId: string;
    gpuClass: string;
    vramGb: number;
    throughputTokensPerSecond: number;
    driverVersion: string;
    recordedAt: Date;
  }): ProviderBenchmarkReport {
    return new ProviderBenchmarkReport(
      ProviderBenchmarkId.create(),
      ProviderNodeId.create(input.providerNodeId),
      ProviderGpuClass.create(input.gpuClass),
      ProviderBenchmarkReport.validateVramGb(input.vramGb),
      ProviderThroughputBaseline.create(input.throughputTokensPerSecond),
      ProviderBenchmarkReport.validateDriverVersion(input.driverVersion),
      input.recordedAt
    );
  }

  public static rehydrate(input: {
    id: string;
    providerNodeId: string;
    gpuClass: string;
    vramGb: number;
    throughputTokensPerSecond: number;
    driverVersion: string;
    recordedAt: Date;
  }): ProviderBenchmarkReport {
    return new ProviderBenchmarkReport(
      ProviderBenchmarkId.create(input.id),
      ProviderNodeId.create(input.providerNodeId),
      ProviderGpuClass.create(input.gpuClass),
      ProviderBenchmarkReport.validateVramGb(input.vramGb),
      ProviderThroughputBaseline.create(input.throughputTokensPerSecond),
      ProviderBenchmarkReport.validateDriverVersion(input.driverVersion),
      input.recordedAt
    );
  }

  public toSnapshot(): ProviderBenchmarkReportSnapshot {
    return {
      id: this.id.value,
      providerNodeId: this.providerNodeId.value,
      gpuClass: this.gpuClass.value,
      vramGb: this.vramGb,
      throughputTokensPerSecond: this.throughputTokensPerSecond.value,
      driverVersion: this.driverVersion,
      recordedAt: this.recordedAt.toISOString()
    };
  }

  private static validateVramGb(rawValue: number): number {
    if (!Number.isInteger(rawValue) || rawValue < 1 || rawValue > 4096) {
      throw new DomainValidationError(
        "Provider benchmark VRAM must be an integer between 1 and 4096 GB."
      );
    }

    return rawValue;
  }

  private static validateDriverVersion(rawValue: string): string {
    const normalizedValue = rawValue.trim();

    if (normalizedValue.length < 3 || normalizedValue.length > 64) {
      throw new DomainValidationError(
        "Provider benchmark driver version must be between 3 and 64 characters."
      );
    }

    return normalizedValue;
  }
}
