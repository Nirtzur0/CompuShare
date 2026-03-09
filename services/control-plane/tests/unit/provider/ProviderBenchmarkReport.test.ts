import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";

describe("ProviderBenchmarkReport", () => {
  it("records a benchmark report snapshot", () => {
    const report = ProviderBenchmarkReport.record({
      providerNodeId: "8f2ab4ae-4ce4-4b93-b759-2019417c5bb4",
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: 742.5,
      driverVersion: "550.54.14",
      recordedAt: new Date("2026-03-09T19:00:00.000Z")
    });

    expect(report.toSnapshot()).toMatchObject({
      providerNodeId: "8f2ab4ae-4ce4-4b93-b759-2019417c5bb4",
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: 742.5,
      driverVersion: "550.54.14",
      recordedAt: "2026-03-09T19:00:00.000Z"
    });
  });

  it("rejects invalid benchmark payloads", () => {
    expect(() =>
      ProviderBenchmarkReport.record({
        providerNodeId: "8f2ab4ae-4ce4-4b93-b759-2019417c5bb4",
        gpuClass: " ",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14",
        recordedAt: new Date("2026-03-09T19:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      ProviderBenchmarkReport.record({
        providerNodeId: "8f2ab4ae-4ce4-4b93-b759-2019417c5bb4",
        gpuClass: "NVIDIA A100",
        vramGb: 0,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14",
        recordedAt: new Date("2026-03-09T19:00:00.000Z")
      })
    ).toThrow(DomainValidationError);

    expect(() =>
      ProviderBenchmarkReport.record({
        providerNodeId: "8f2ab4ae-4ce4-4b93-b759-2019417c5bb4",
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 0,
        driverVersion: "550.54.14",
        recordedAt: new Date("2026-03-09T19:00:00.000Z")
      })
    ).toThrow(DomainValidationError);
  });
});
