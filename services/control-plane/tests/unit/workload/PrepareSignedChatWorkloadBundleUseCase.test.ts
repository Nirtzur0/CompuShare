import { describe, expect, it } from "vitest";
import { PrepareSignedChatWorkloadBundleUseCase } from "../../../src/application/workload/PrepareSignedChatWorkloadBundleUseCase.js";
import { VerifySignedWorkloadBundleAdmissionUseCase } from "../../../src/application/workload/VerifySignedWorkloadBundleAdmissionUseCase.js";
import { SignedWorkloadBundle } from "../../../src/domain/workload/SignedWorkloadBundle.js";
import { InMemoryApprovedChatModelCatalog } from "../../../src/infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { HmacWorkloadBundleSignatureService } from "../../../src/infrastructure/security/HmacWorkloadBundleSignatureService.js";

function getDefaultManifest() {
  const manifest = InMemoryApprovedChatModelCatalog.createDefault().findByAlias(
    "openai/gpt-oss-120b-like"
  );

  if (manifest === null) {
    throw new Error("Expected default approved chat manifest to exist.");
  }

  return manifest;
}

function createVerifier(
  signatureService: {
    sign: HmacWorkloadBundleSignatureService["sign"];
    verify: HmacWorkloadBundleSignatureService["verify"];
  },
  record: (event: { eventName: string }) => Promise<void>
) {
  return new VerifySignedWorkloadBundleAdmissionUseCase(
    signatureService,
    InMemoryApprovedChatModelCatalog.createDefault(),
    {
      record
    }
  );
}

describe("PrepareSignedChatWorkloadBundleUseCase", () => {
  it("signs and admits a chat workload bundle against the approved manifest policy", async () => {
    const auditEvents: string[] = [];
    const useCase = new PrepareSignedChatWorkloadBundleUseCase(
      new HmacWorkloadBundleSignatureService(
        "local-workload-signing-secret-1234567890",
        "local-hmac-v1"
      ),
      createVerifier(
        new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "local-hmac-v1"
        ),
        (event) => {
          auditEvents.push(event.eventName);
          return Promise.resolve();
        }
      ),
      () => new Date("2026-03-09T20:30:00.000Z")
    );
    const manifest = getDefaultManifest();

    const signedBundle = await useCase.execute({
      actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
      customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
      environment: "production",
      manifest,
      providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
      request: {
        model: "openai/gpt-oss-120b-like",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 2048,
        temperature: 0.5,
        top_p: 0.9
      }
    });

    expect(signedBundle.toSnapshot()).toMatchObject({
      signatureKeyId: "local-hmac-v1",
      bundle: {
        modelManifestId: "chat-gpt-oss-120b-like-v1",
        networkPolicy: "provider-endpoint-only",
        runtimeConfig: {
          maxTokens: 2048
        }
      }
    });
    expect(auditEvents).toEqual(["workload_bundle.admission.accepted"]);
  });

  it("rejects bundles when the signing key does not match the verifier", async () => {
    const signatureService = {
      sign(bundle: Parameters<HmacWorkloadBundleSignatureService["sign"]>[0]) {
        return new HmacWorkloadBundleSignatureService(
          "local-workload-signing-secret-1234567890",
          "wrong-key-id"
        ).sign(bundle);
      },
      verify() {
        return false;
      }
    };
    const useCase = new PrepareSignedChatWorkloadBundleUseCase(
      signatureService,
      createVerifier(signatureService, async () => Promise.resolve())
    );
    const manifest = getDefaultManifest();

    await expect(
      useCase.execute({
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        manifest,
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toThrow("signature_invalid");
  });

  it("rejects policy-drifted bundles with explicit reasons", async () => {
    const manifest = getDefaultManifest();
    const tamper = (
      field:
        | "modelManifestId"
        | "imageDigest"
        | "networkPolicy"
        | "maxTokens"
        | "maxRuntimeSeconds"
        | "customerOrganizationId"
    ) =>
      new PrepareSignedChatWorkloadBundleUseCase(
        {
          sign(
            bundle: Parameters<HmacWorkloadBundleSignatureService["sign"]>[0]
          ) {
            const snapshot = bundle.toSnapshot();

            if (field === "modelManifestId") {
              snapshot.modelManifestId = "other-manifest";
            }

            if (field === "imageDigest") {
              snapshot.imageDigest =
                "sha256:2222222222222222222222222222222222222222222222222222222222222222";
            }

            if (field === "networkPolicy") {
              snapshot.networkPolicy = "open-egress";
            }

            if (field === "maxTokens") {
              snapshot.runtimeConfig.maxTokens = 9000;
            }

            if (field === "maxRuntimeSeconds") {
              snapshot.maxRuntimeSeconds = 121;
            }

            if (field === "customerOrganizationId") {
              snapshot.customerOrganizationId =
                "11111111-1111-4111-8111-111111111111";
            }

            return SignedWorkloadBundle.rehydrate({
              bundle: snapshot,
              signature:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              signatureKeyId: "local-hmac-v1"
            });
          },
          verify() {
            return true;
          }
        },
        createVerifier(
          {
            sign(
              bundle: Parameters<HmacWorkloadBundleSignatureService["sign"]>[0]
            ) {
              const snapshot = bundle.toSnapshot();

              if (field === "modelManifestId") {
                snapshot.modelManifestId = "other-manifest";
              }

              if (field === "imageDigest") {
                snapshot.imageDigest =
                  "sha256:2222222222222222222222222222222222222222222222222222222222222222";
              }

              if (field === "networkPolicy") {
                snapshot.networkPolicy = "open-egress";
              }

              if (field === "maxTokens") {
                snapshot.runtimeConfig.maxTokens = 9000;
              }

              if (field === "maxRuntimeSeconds") {
                snapshot.maxRuntimeSeconds = 121;
              }

              if (field === "customerOrganizationId") {
                snapshot.customerOrganizationId =
                  "11111111-1111-4111-8111-111111111111";
              }

              return SignedWorkloadBundle.rehydrate({
                bundle: snapshot,
                signature:
                  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                signatureKeyId: "local-hmac-v1"
              });
            },
            verify() {
              return true;
            }
          },
          async () => Promise.resolve()
        )
      );

    await expect(
      tamper("modelManifestId").execute({
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        manifest,
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toThrow("manifest_unapproved");

    await expect(
      tamper("imageDigest").execute({
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        manifest,
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toThrow("image_digest_mismatch");

    await expect(
      tamper("networkPolicy").execute({
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        manifest,
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toThrow("network_policy_mismatch");

    await expect(
      tamper("maxTokens").execute({
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        manifest,
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toThrow("max_tokens_exceeds_manifest_policy");

    await expect(
      tamper("maxRuntimeSeconds").execute({
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        manifest,
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toThrow("max_runtime_exceeds_manifest_policy");

    await expect(
      tamper("customerOrganizationId").execute({
        actorUserId: "f5d6a4d7-3171-4f39-8d63-e1b5153e262c",
        customerOrganizationId: "0d6b1676-f112-41d6-9f98-27277a0dba79",
        environment: "production",
        manifest,
        providerNodeId: "4903f4af-fdd1-44fd-b2a0-a7d6106db1d9",
        request: {
          model: "openai/gpt-oss-120b-like",
          messages: [{ role: "user", content: "Hello" }]
        }
      })
    ).rejects.toThrow("customer_organization_mismatch");
  });
});
