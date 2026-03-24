import { describe, expect, it } from "vitest";
import { PlacementScoringPolicy } from "../../../src/config/PlacementScoringPolicy.js";
import { PlacementCandidatePlanner } from "../../../src/application/placement/PlacementCandidatePlanner.js";
import { PlacementRequirements } from "../../../src/domain/placement/PlacementRequirements.js";
import { ProviderBenchmarkReport } from "../../../src/domain/provider/ProviderBenchmarkReport.js";
import { ProviderInventorySummary } from "../../../src/domain/provider/ProviderInventorySummary.js";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";

describe("PlacementCandidatePlanner", () => {
  it("prefers a warm alias match when the multiplier lifts the final score above a colder node", () => {
    const planner = new PlacementCandidatePlanner(
      PlacementScoringPolicy.createDefault(),
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const candidates = planner.buildCandidates(
      createRequirements(),
      [
        createSummary({
          providerNodeId: "f1c6255a-8bd1-4380-8579-f90c837e0a20",
          label: "Cold price/perf",
          throughputTokensPerSecond: 900,
          priceFloorUsdPerHour: 10
        }),
        createSummary({
          providerNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
          label: "Warm winner",
          throughputTokensPerSecond: 690,
          priceFloorUsdPerHour: 8.5,
          warmAliasExpiresAt: "2026-03-10T10:10:00.000Z"
        })
      ],
      new Map(),
      "openai/gpt-oss-120b-like"
    );

    expect(candidates.map((candidate) => candidate.providerNodeLabel)).toEqual([
      "Warm winner",
      "Cold price/perf"
    ]);
    expect(candidates[0]?.warmCacheMultiplier).toBe(1.15);
  });

  it("ignores expired warm aliases", () => {
    const planner = new PlacementCandidatePlanner(
      PlacementScoringPolicy.createDefault(),
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    const candidates = planner.buildCandidates(
      createRequirements(),
      [
        createSummary({
          providerNodeId: "f1c6255a-8bd1-4380-8579-f90c837e0a20",
          label: "Cold price/perf",
          throughputTokensPerSecond: 900,
          priceFloorUsdPerHour: 10
        }),
        createSummary({
          providerNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
          label: "Expired warm",
          throughputTokensPerSecond: 690,
          priceFloorUsdPerHour: 8.5,
          warmAliasExpiresAt: "2026-03-10T10:01:00.000Z"
        })
      ],
      new Map(),
      "openai/gpt-oss-120b-like"
    );

    expect(candidates[0]?.providerNodeLabel).toBe("Cold price/perf");
    expect(candidates[0]?.warmCacheMultiplier).toBe(1);
  });

  it("filters out unhealthy nodes and nodes without benchmarks", () => {
    const planner = new PlacementCandidatePlanner(
      PlacementScoringPolicy.createDefault(),
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const candidates = planner.buildCandidates(createRequirements(), [
      createSummary({
        providerNodeId: "f1c6255a-8bd1-4380-8579-f90c837e0a20",
        label: "Healthy benchmarked",
        throughputTokensPerSecond: 800,
        priceFloorUsdPerHour: 10
      }),
      createSummary({
        providerNodeId: "01c6255a-8bd1-4380-8579-f90c837e0a20",
        label: "Degraded",
        throughputTokensPerSecond: 900,
        priceFloorUsdPerHour: 9,
        healthState: "degraded"
      }),
      new ProviderInventorySummary(
        ProviderNode.rehydrate({
          id: "17c6255a-8bd1-4380-8579-f90c837e0a20",
          organizationId: "d8d5e60c-cd17-40fd-b66d-8b05eff10d9c",
          machineId: "17c6255a-8bd1-4380-8579-f90c837e0a20-machine",
          label: "No benchmark",
          runtime: "linux",
          region: "eu-central-1",
          hostname: "no-benchmark.internal",
          trustTier: "t1_vetted",
          healthState: "healthy",
          inventory: {
            driverVersion: "550.54.14",
            gpus: [
              {
                model: "NVIDIA A100",
                vramGb: 80,
                count: 4,
                interconnect: "nvlink"
              }
            ]
          },
          routingProfile: {
            providerNodeId: "17c6255a-8bd1-4380-8579-f90c837e0a20",
            endpointUrl: "https://no-benchmark.example.com/v1/chat/completions",
            priceFloorUsdPerHour: 9,
            updatedAt: "2026-03-10T09:30:00.000Z"
          },
          enrolledAt: new Date("2026-03-09T18:10:00.000Z")
        }),
        null
      )
    ], new Map());

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.providerNodeLabel).toBe("Healthy benchmarked");
  });

  it("uses deterministic tie-breakers after score parity", () => {
    const planner = new PlacementCandidatePlanner(
      PlacementScoringPolicy.createDefault(),
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const candidates = planner.buildCandidates(createRequirements(), [
      createSummary({
        providerNodeId: "b1c6255a-8bd1-4380-8579-f90c837e0a20",
        label: "Higher price",
        throughputTokensPerSecond: 800,
        priceFloorUsdPerHour: 10
      }),
      createSummary({
        providerNodeId: "a1c6255a-8bd1-4380-8579-f90c837e0a20",
        label: "Lower price",
        throughputTokensPerSecond: 720,
        priceFloorUsdPerHour: 9
      })
    ], new Map());

    expect(candidates.map((candidate) => candidate.providerNodeLabel)).toEqual([
      "Lower price",
      "Higher price"
    ]);
  });

  it("applies the lost-dispute penalty before final ordering", () => {
    const planner = new PlacementCandidatePlanner(
      PlacementScoringPolicy.createDefault(),
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const candidates = planner.buildCandidates(
      createRequirements(),
      [
        createSummary({
          providerNodeId: "b1c6255a-8bd1-4380-8579-f90c837e0a20",
          organizationId: "11111111-cd17-40fd-b66d-8b05eff10d9c",
          label: "Penalty-free",
          throughputTokensPerSecond: 640,
          priceFloorUsdPerHour: 8
        }),
        createSummary({
          providerNodeId: "a1c6255a-8bd1-4380-8579-f90c837e0a20",
          organizationId: "d8d5e60c-cd17-40fd-b66d-8b05eff10d9c",
          label: "Penalty-hit",
          throughputTokensPerSecond: 720,
          priceFloorUsdPerHour: 8
        })
      ],
      new Map([
        ["d8d5e60c-cd17-40fd-b66d-8b05eff10d9c", 3]
      ])
    );

    expect(candidates[0]?.providerNodeLabel).toBe("Penalty-free");
    expect(candidates[1]?.providerNodeLabel).toBe("Penalty-hit");
    expect(candidates[1]?.disputePenaltyMultiplier).toBe(0.7);
    expect(candidates[1]?.lostDisputeCount90d).toBe(3);
  });
});

function createRequirements(): PlacementRequirements {
  return PlacementRequirements.create({
    gpuClass: "NVIDIA A100",
    minVramGb: 80,
    region: "eu-central-1",
    minimumTrustTier: "t1_vetted",
    maxPriceUsdPerHour: 10
  });
}

function createSummary(input: {
  providerNodeId: string;
  organizationId?: string;
  label: string;
  throughputTokensPerSecond: number;
  priceFloorUsdPerHour: number;
  healthState?: "healthy" | "degraded" | "paused";
  warmAliasExpiresAt?: string;
}): ProviderInventorySummary {
  return new ProviderInventorySummary(
    ProviderNode.rehydrate({
      id: input.providerNodeId,
      organizationId:
        input.organizationId ?? "d8d5e60c-cd17-40fd-b66d-8b05eff10d9c",
      machineId: `${input.providerNodeId}-machine`,
      label: input.label,
      runtime: "linux",
      region: "eu-central-1",
      hostname: `${input.providerNodeId}.internal`,
      trustTier: "t1_vetted",
      healthState: input.healthState ?? "healthy",
      inventory: {
        driverVersion: "550.54.14",
        gpus: [
          {
            model: "NVIDIA A100",
            vramGb: 80,
            count: 4,
            interconnect: "nvlink"
          }
        ]
      },
      routingProfile: {
        providerNodeId: input.providerNodeId,
        endpointUrl: `https://${input.providerNodeId}.example.com/v1/chat/completions`,
        priceFloorUsdPerHour: input.priceFloorUsdPerHour,
        updatedAt: "2026-03-10T09:30:00.000Z"
      },
      ...(input.warmAliasExpiresAt === undefined
        ? {}
        : {
            routingState: {
              warmModelAliases: [
                {
                  approvedModelAlias: "openai/gpt-oss-120b-like",
                  declaredAt: "2026-03-10T10:00:00.000Z",
                  expiresAt: input.warmAliasExpiresAt
                }
              ]
            }
          }),
      enrolledAt: new Date("2026-03-09T18:10:00.000Z")
    }),
    ProviderBenchmarkReport.record({
      providerNodeId: input.providerNodeId,
      gpuClass: "NVIDIA A100",
      vramGb: 80,
      throughputTokensPerSecond: input.throughputTokensPerSecond,
      driverVersion: "550.54.14",
      recordedAt: new Date("2026-03-10T09:00:00.000Z")
    })
  );
}
