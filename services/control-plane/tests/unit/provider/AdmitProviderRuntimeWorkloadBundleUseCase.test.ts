import { describe, expect, it } from "vitest";
import { AdmitProviderRuntimeWorkloadBundleUseCase } from "../../../src/application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import { WorkloadBundle } from "../../../src/domain/workload/WorkloadBundle.js";
import { HmacWorkloadBundleSignatureService } from "../../../src/infrastructure/security/HmacWorkloadBundleSignatureService.js";

describe("AdmitProviderRuntimeWorkloadBundleUseCase", () => {
  it("loads the provider node runtime and delegates to shared verification", async () => {
    const signatureService = new HmacWorkloadBundleSignatureService(
      "local-workload-signing-secret-1234567890",
      "local-hmac-v1"
    );
    const signedBundle = signatureService.sign(
      WorkloadBundle.issue({
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        imageDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        runtimeConfig: {
          requestKind: "chat.completions",
          streamingEnabled: false,
          maxTokens: 1024,
          temperature: null,
          topP: null
        },
        networkPolicy: "provider-endpoint-only",
        maxRuntimeSeconds: 120,
        customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        createdAt: new Date("2026-03-16T10:00:00.000Z")
      })
    );
    const useCase = new AdmitProviderRuntimeWorkloadBundleUseCase(
      {
        execute: () =>
          Promise.resolve({
            node: {
              id: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
              organizationId: "f309659d-61c5-4c7d-b94d-55a9c2ba663c",
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
              routingProfile: null,
              enrolledAt: "2026-03-16T09:50:00.000Z"
            },
            latestBenchmark: null
          })
      },
      {
        execute: (request) => {
          expect(request.providerNodeRuntime).toBe("linux");
          expect(request.expectedCustomerOrganizationId).toBe(
            "87057cb0-e0ca-4095-9f25-dd8103408b18"
          );

          return Promise.resolve({
            admitted: true,
            bundleId: request.signedBundle.bundle.id,
            manifestId: request.signedBundle.bundle.modelManifestId,
            signatureKeyId: request.signedBundle.signatureKeyId,
            customerOrganizationId:
              request.signedBundle.bundle.customerOrganizationId.value,
            verifiedAt: "2026-03-16T10:05:00.000Z"
          });
        }
      }
    );

    const response = await useCase.execute({
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      organizationId: "f309659d-61c5-4c7d-b94d-55a9c2ba663c",
      environment: "production",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      signedBundle: signedBundle.toSnapshot()
    });

    expect(response).toEqual({
      admission: {
        admitted: true,
        bundleId: signedBundle.bundle.id,
        manifestId: "chat-gpt-oss-120b-like-v1",
        signatureKeyId: "local-hmac-v1",
        customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        admittedAt: "2026-03-16T10:05:00.000Z"
      }
    });
  });
});
