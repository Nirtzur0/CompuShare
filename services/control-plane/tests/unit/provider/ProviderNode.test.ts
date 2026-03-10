import { describe, expect, it } from "vitest";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";

describe("ProviderNode", () => {
  it("enrolls a node with default trust and health state", () => {
    const providerNode = ProviderNode.enroll({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-0001",
      label: "Primary Vetted Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: "node-01.internal",
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
      enrolledAt: new Date("2026-03-09T17:00:00.000Z")
    });

    expect(providerNode.toSnapshot()).toMatchObject({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-0001",
      label: "Primary Vetted Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: "node-01.internal",
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
      routingState: {
        warmModelAliases: []
      },
      enrolledAt: "2026-03-09T17:00:00.000Z"
    });
  });

  it("rehydrates a persisted provider node", () => {
    const providerNode = ProviderNode.rehydrate({
      id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-0001",
      label: "Primary Vetted Node",
      runtime: "kubernetes",
      region: "eu-central-1",
      hostname: "node-01.internal",
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
      enrolledAt: new Date("2026-03-09T17:00:00.000Z")
    });

    expect(providerNode.toSnapshot().runtime).toBe("kubernetes");
    expect(providerNode.toSnapshot().id).toBe(
      "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
    );
  });

  it("rehydrates a persisted provider node with routing metadata", () => {
    const providerNode = ProviderNode.rehydrate({
      id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-0001",
      label: "Primary Vetted Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: "node-01.internal",
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
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        endpointUrl: "https://node-01.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25,
        updatedAt: "2026-03-12T19:15:00.000Z"
      },
      enrolledAt: new Date("2026-03-09T17:00:00.000Z")
    });

    expect(providerNode.toSnapshot().routingProfile).toMatchObject({
      endpointUrl: "https://node-01.example.com/v1/chat/completions",
      priceFloorUsdPerHour: 5.25
    });
  });

  it("rehydrates a persisted provider node with attestation metadata", () => {
    const providerNode = ProviderNode.rehydrate({
      id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-0001",
      label: "Primary Vetted Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: "node-01.internal",
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
      attestation: {
        status: "verified",
        lastAttestedAt: "2026-03-10T10:01:00.000Z",
        attestationExpiresAt: "2026-03-11T10:01:00.000Z",
        attestationType: "tpm_quote_v1",
        effectiveTrustTier: "t2_attested"
      },
      enrolledAt: new Date("2026-03-09T17:00:00.000Z")
    });

    expect(providerNode.toSnapshot().attestation).toMatchObject({
      status: "verified",
      effectiveTrustTier: "t2_attested",
      attestationType: "tpm_quote_v1"
    });
  });

  it("rehydrates a persisted provider node with warm routing state", () => {
    const providerNode = ProviderNode.rehydrate({
      id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-0001",
      label: "Primary Vetted Node",
      runtime: "linux",
      region: "eu-central-1",
      hostname: "node-01.internal",
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
      routingState: {
        warmModelAliases: [
          {
            approvedModelAlias: "openai/gpt-oss-120b-like",
            declaredAt: "2026-03-10T10:00:00.000Z",
            expiresAt: "2026-03-10T10:10:00.000Z"
          }
        ]
      },
      enrolledAt: new Date("2026-03-09T17:00:00.000Z")
    });

    expect(providerNode.toSnapshot().routingState).toEqual({
      warmModelAliases: [
        {
          approvedModelAlias: "openai/gpt-oss-120b-like",
          declaredAt: "2026-03-10T10:00:00.000Z",
          expiresAt: "2026-03-10T10:10:00.000Z"
        }
      ]
    });
  });
});
