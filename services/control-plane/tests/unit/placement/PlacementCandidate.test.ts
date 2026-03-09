import { describe, expect, it } from "vitest";
import { PlacementCandidate } from "../../../src/domain/placement/PlacementCandidate.js";
import { ProviderInventorySummary } from "../../../src/domain/provider/ProviderInventorySummary.js";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";

describe("PlacementCandidate", () => {
  it("rejects inventory summaries without routing metadata", () => {
    const summary = new ProviderInventorySummary(
      ProviderNode.rehydrate({
        id: "acbc0011-2b62-4d44-aad9-073145f26058",
        organizationId: "92c29536-a369-47f8-a724-c1e21a76d0ec",
        machineId: "placement-no-routing-0001",
        label: "No Routing",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "no-routing.internal",
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
        routingProfile: null,
        enrolledAt: new Date("2026-03-09T18:10:00.000Z")
      }),
      null
    );

    expect(() =>
      PlacementCandidate.fromInventorySummary({
        summary,
        matchedGpu: {
          model: "NVIDIA A100",
          vramGb: 80,
          count: 4,
          interconnect: "nvlink"
        }
      })
    ).toThrow("PlacementCandidate requires a routing profile");
  });
});
