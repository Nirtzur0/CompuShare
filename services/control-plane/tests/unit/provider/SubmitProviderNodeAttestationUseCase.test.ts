import { describe, expect, it } from "vitest";
import { ProviderNode } from "../../../src/domain/provider/ProviderNode.js";
import { ProviderNodeAttestationChallenge } from "../../../src/domain/provider/ProviderNodeAttestationChallenge.js";
import type { ProviderNodeAttestationRepository } from "../../../src/application/provider/ports/ProviderNodeAttestationRepository.js";
import {
  ProviderNodeAttestationCapabilityRequiredError,
  ProviderNodeAttestationNodeNotFoundError,
  ProviderNodeAttestationOrganizationNotFoundError,
  ProviderNodeAttestationRuntimeUnsupportedError
} from "../../../src/application/provider/IssueProviderNodeAttestationChallengeUseCase.js";
import {
  ProviderNodeAttestationChallengeAlreadyUsedError,
  ProviderNodeAttestationChallengeExpiredError,
  ProviderNodeAttestationChallengeNotFoundError,
  ProviderNodeAttestationVerificationFailedError,
  SubmitProviderNodeAttestationUseCase
} from "../../../src/application/provider/SubmitProviderNodeAttestationUseCase.js";
import { ProviderNodeAttestationPolicy } from "../../../src/config/ProviderNodeAttestationPolicy.js";

class InMemoryProviderNodeAttestationRepository implements ProviderNodeAttestationRepository {
  public challenge: ProviderNodeAttestationChallenge | null =
    ProviderNodeAttestationChallenge.rehydrate({
      id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z"),
      usedAt: new Date("2026-03-10T10:01:00.000Z")
    });
  public consumeResult = false;
  public recordedAttestations = 0;
  public capabilities: readonly "provider"[] | readonly [] | null = [
    "provider"
  ];
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
    return Promise.resolve(this.challenge);
  }

  public markProviderNodeAttestationChallengeUsed() {
    return Promise.resolve(this.consumeResult);
  }

  public createProviderNodeAttestationRecord() {
    this.recordedAttestations += 1;
    return Promise.resolve();
  }
}

describe("SubmitProviderNodeAttestationUseCase", () => {
  function buildRequest() {
    return {
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      challengeId: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      attestationType: "tpm_quote_v1",
      attestationPublicKeyPem: "pem",
      quoteBase64: "cXVvdGU=",
      pcrValues: {
        "0": "1111111111111111111111111111111111111111111111111111111111111111"
      },
      secureBootEnabled: true
    } as const;
  }

  it("rejects unknown organizations", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.capabilities = null;
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      { verify: () => Promise.reject(new Error("unused")) },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationOrganizationNotFoundError
    );
  });

  it("rejects organizations without provider capability", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.capabilities = [];
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      { verify: () => Promise.reject(new Error("unused")) },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationCapabilityRequiredError
    );
  });

  it("rejects missing provider nodes", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.providerNode = null;
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      { verify: () => Promise.reject(new Error("unused")) },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationNodeNotFoundError
    );
  });

  it("rejects runtimes that do not support TPM attestation", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.providerNode = ProviderNode.enroll({
      organizationId: "7fdb9fb4-a1e6-4343-ab14-068519d4e5d6",
      machineId: "node-machine-k8s-0001",
      label: "Kubernetes Node",
      runtime: "kubernetes",
      region: "eu-central-1",
      hostname: "node-02.internal",
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
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      { verify: () => Promise.reject(new Error("unused")) },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationRuntimeUnsupportedError
    );
  });

  it("rejects replayed challenges", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      {
        verify: () =>
          Promise.resolve({
            attestationPublicKeyFingerprint: "fingerprint",
            quotedAt: new Date("2026-03-10T10:00:30.000Z")
          })
      },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationChallengeAlreadyUsedError
    );
  });

  it("rejects missing challenges", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.challenge = null;
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      {
        verify: () =>
          Promise.resolve({
            attestationPublicKeyFingerprint: "fingerprint",
            quotedAt: new Date("2026-03-10T10:00:30.000Z")
          })
      },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationChallengeNotFoundError
    );
  });

  it("rejects expired challenges", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.challenge = ProviderNodeAttestationChallenge.rehydrate({
      id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:01:00.000Z"),
      usedAt: null
    });
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      {
        verify: () =>
          Promise.resolve({
            attestationPublicKeyFingerprint: "fingerprint",
            quotedAt: new Date("2026-03-10T10:00:30.000Z")
          })
      },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationChallengeExpiredError
    );
  });

  it("records and maps verification failures", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.challenge = ProviderNodeAttestationChallenge.rehydrate({
      id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z"),
      usedAt: null
    });
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      {
        verify: () => Promise.reject(new Error("signature_invalid"))
      },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationVerificationFailedError
    );
    expect(repository.recordedAttestations).toBe(1);
  });

  it("maps a concurrent challenge-consumption loss to replay detection", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.challenge = ProviderNodeAttestationChallenge.rehydrate({
      id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z"),
      usedAt: null
    });
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      {
        verify: () =>
          Promise.resolve({
            attestationPublicKeyFingerprint: "fingerprint",
            quotedAt: new Date("2026-03-10T10:00:30.000Z")
          })
      },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    await expect(useCase.execute(buildRequest())).rejects.toBeInstanceOf(
      ProviderNodeAttestationChallengeAlreadyUsedError
    );
    expect(repository.recordedAttestations).toBe(0);
  });

  it("returns a verified attestation when evidence and challenge consumption succeed", async () => {
    const repository = new InMemoryProviderNodeAttestationRepository();
    repository.challenge = ProviderNodeAttestationChallenge.rehydrate({
      id: "87f3c02f-0ddb-4b90-b3cb-ec75428eaf03",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      nonce: "abcdefghijklmnopqrstuvwxyzABCDEFG123456",
      createdAt: new Date("2026-03-10T10:00:00.000Z"),
      expiresAt: new Date("2026-03-10T10:05:00.000Z"),
      usedAt: null
    });
    repository.consumeResult = true;
    const useCase = new SubmitProviderNodeAttestationUseCase(
      repository,
      {
        verify: () =>
          Promise.resolve({
            attestationPublicKeyFingerprint: "fingerprint",
            quotedAt: new Date("2026-03-10T10:00:30.000Z")
          })
      },
      ProviderNodeAttestationPolicy.createDefault(),
      { record: () => Promise.resolve() },
      () => new Date("2026-03-10T10:02:00.000Z")
    );

    const response = await useCase.execute(buildRequest());

    expect(response.attestation.effectiveTrustTier).toBe("t2_attested");
    expect(repository.recordedAttestations).toBe(1);
  });
});
