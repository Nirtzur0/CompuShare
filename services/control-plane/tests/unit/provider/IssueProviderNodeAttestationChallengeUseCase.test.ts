import { describe, expect, it } from "vitest";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";
import type { ProviderNodeAttestationRepository } from "../../../src/application/provider/ports/ProviderNodeAttestationRepository.js";
import {
  IssueProviderNodeAttestationChallengeUseCase,
  ProviderNodeAttestationCapabilityRequiredError,
  ProviderNodeAttestationNodeNotFoundError,
  ProviderNodeAttestationOrganizationNotFoundError,
  ProviderNodeAttestationRuntimeUnsupportedError
} from "../../../src/application/provider/IssueProviderNodeAttestationChallengeUseCase.js";
import { ProviderNodeAttestationPolicy } from "../../../src/config/ProviderNodeAttestationPolicy.js";

class InMemoryProviderNodeAttestationRepository implements ProviderNodeAttestationRepository {
  public capabilities: readonly ("provider" | "buyer")[] | null = ["provider"];
  public providerNode: ProviderNode | null = ProviderNode.enroll({
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

  public findOrganizationAccountCapabilities() {
    return Promise.resolve(this.capabilities);
  }

  public findProviderNodeByOrganization() {
    return Promise.resolve(this.providerNode);
  }

  public createProviderNodeAttestationChallenge() {
    return Promise.resolve();
  }

  public findProviderNodeAttestationChallenge() {
    return Promise.resolve(null);
  }

  public markProviderNodeAttestationChallengeUsed() {
    return Promise.resolve(false);
  }

  public createProviderNodeAttestationRecord() {
    return Promise.resolve();
  }
}

describe("IssueProviderNodeAttestationChallengeUseCase", () => {
  it("issues a challenge for a linux provider node", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    const useCase = new IssueProviderNodeAttestationChallengeUseCase(
      repository,
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:00:00.000Z"),
      () => "abcdefghijklmnopqrstuvwxyzABCDEFG123456"
    );

    const response = await useCase.execute({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      providerNodeId: repository.providerNode?.id.value ?? ""
    });

    expect(response.challenge.nonce).toBe(
      "abcdefghijklmnopqrstuvwxyzABCDEFG123456"
    );
    expect(response.challenge.expiresAt).toBe("2026-03-10T10:05:00.000Z");
  });

  it("rejects unknown organizations", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.capabilities = null;
    const useCase = new IssueProviderNodeAttestationChallengeUseCase(
      repository,
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderNodeAttestationOrganizationNotFoundError);
  });

  it("requires provider capability", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.capabilities = ["buyer"];
    const useCase = new IssueProviderNodeAttestationChallengeUseCase(
      repository,
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderNodeAttestationCapabilityRequiredError);
  });

  it("rejects unknown provider nodes", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.providerNode = null;
    const useCase = new IssueProviderNodeAttestationChallengeUseCase(
      repository,
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43"
      })
    ).rejects.toBeInstanceOf(ProviderNodeAttestationNodeNotFoundError);
  });

  it("rejects unsupported runtimes", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.providerNode = ProviderNode.enroll({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-0002",
      label: "Kubernetes Node",
      runtime: "kubernetes",
      region: "eu-central-1",
      hostname: "k8s-node.internal",
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
    const useCase = new IssueProviderNodeAttestationChallengeUseCase(
      repository,
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() }
    );

    await expect(
      useCase.execute({
        organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
        providerNodeId: repository.providerNode.id.value
      })
    ).rejects.toBeInstanceOf(ProviderNodeAttestationRuntimeUnsupportedError);
  });
});
