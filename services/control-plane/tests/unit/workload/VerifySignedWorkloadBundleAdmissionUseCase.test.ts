import { describe, expect, it } from "vitest";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../../src/application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { WorkloadBundle } from "../../../src/domain/workload/WorkloadBundle.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { HmacWorkloadBundleSignatureService } from "../../../src/infrastructure/security/HmacWorkloadBundleSignatureService.js";

function createSignedBundle() {
  const signatureService = new HmacWorkloadBundleSignatureService(
    "local-workload-signing-secret-1234567890",
    "local-hmac-v1"
  );
  const bundle = WorkloadBundle.issue({
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
  });

  return {
    signatureService,
    signedBundle: signatureService.sign(bundle)
  };
}

describe("VerifySignedWorkloadBundleAdmissionUseCase", () => {
  it("accepts a valid signed workload bundle and emits an audit event", async () => {
    const auditEvents: string[] = [];
    const { signatureService, signedBundle } = createSignedBundle();
    const useCase = new VerifySignedWorkloadBundleAdmissionUseCase(
      signatureService,
      InMemoryApprovedChatModelCatalog.createDefault(),
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      },
      () => new Date("2026-03-16T10:05:00.000Z")
    );

    const response = await useCase.execute({
      actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
      auditOrganizationId: "f309659d-61c5-4c7d-b94d-55a9c2ba663c",
      environment: "production",
      providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
      expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      signedBundle,
      providerNodeRuntime: "linux"
    });

    expect(response).toMatchObject({
      admitted: true,
      manifestId: "chat-gpt-oss-120b-like-v1",
      customerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      signatureKeyId: "local-hmac-v1"
    });
    expect(auditEvents).toEqual(["workload_bundle.admission.accepted"]);
  });

  it("rejects bundles when the customer organization scope does not match", async () => {
    const { signatureService, signedBundle } = createSignedBundle();
    const useCase = new VerifySignedWorkloadBundleAdmissionUseCase(
      signatureService,
      InMemoryApprovedChatModelCatalog.createDefault(),
      {
        record: async () => Promise.resolve()
      }
    );

    await expect(
      useCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        auditOrganizationId: "f309659d-61c5-4c7d-b94d-55a9c2ba663c",
        environment: "production",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        expectedCustomerOrganizationId: "11111111-1111-4111-8111-111111111111",
        signedBundle,
        providerNodeRuntime: "linux"
      })
    ).rejects.toThrow("customer_organization_mismatch");
  });

  it("rejects bundles when the provider node runtime is unsupported", async () => {
    const auditEvents: string[] = [];
    const { signatureService, signedBundle } = createSignedBundle();
    const useCase = new VerifySignedWorkloadBundleAdmissionUseCase(
      signatureService,
      {
        findByAlias: () => null,
        findByManifestId: () =>
          InMemoryApprovedChatModelCatalog.createDefault().findByManifestId(
            "chat-gpt-oss-120b-like-v1"
          ),
        listAll: () => []
      },
      {
        record: (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      }
    );

    await expect(
      useCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        auditOrganizationId: "f309659d-61c5-4c7d-b94d-55a9c2ba663c",
        environment: "production",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle,
        providerNodeRuntime: "windows" as never
      })
    ).rejects.toThrow("provider_runtime_unsupported");
    expect(auditEvents).toEqual(["workload_bundle.admission.rejected"]);
  });

  it("rejects bundles when the manifest is not approved", async () => {
    const { signatureService, signedBundle } = createSignedBundle();
    const useCase = new VerifySignedWorkloadBundleAdmissionUseCase(
      signatureService,
      {
        findByAlias: () => null,
        findByManifestId: () => null,
        listAll: () => []
      },
      {
        record: async () => Promise.resolve()
      }
    );

    await expect(
      useCase.execute({
        actorUserId: "345db7ff-1355-43c7-b333-6ae1e7246c3f",
        auditOrganizationId: "f309659d-61c5-4c7d-b94d-55a9c2ba663c",
        environment: "production",
        providerNodeId: "ab3f9623-eb23-4dc8-8f15-2d84f5b48e43",
        expectedCustomerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        signedBundle,
        providerNodeRuntime: "linux"
      })
    ).rejects.toThrow("manifest_unapproved");
  });
});
