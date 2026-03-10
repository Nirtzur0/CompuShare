import {
  createHash,
  generateKeyPairSync,
  randomUUID,
  sign as signPayload
} from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { z } from "zod";
import { GetConsumerDashboardOverviewUseCase } from "../../../src/application/dashboard/GetConsumerDashboardOverviewUseCase.js";
import { GetProviderDashboardOverviewUseCase } from "../../../src/application/dashboard/GetProviderDashboardOverviewUseCase.js";
import { GetOrganizationWalletSummaryUseCase } from "../../../src/application/ledger/GetOrganizationWalletSummaryUseCase.js";
import { GetStagedPayoutExportUseCase } from "../../../src/application/ledger/GetStagedPayoutExportUseCase.js";
import { RecordCompletedJobSettlementUseCase } from "../../../src/application/ledger/RecordCompletedJobSettlementUseCase.js";
import { RecordCustomerChargeUseCase } from "../../../src/application/ledger/RecordCustomerChargeUseCase.js";
import { AuthenticateOrganizationApiKeyUseCase } from "../../../src/application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { AcceptOrganizationInvitationUseCase } from "../../../src/application/identity/AcceptOrganizationInvitationUseCase.js";
import { CreateOrganizationUseCase } from "../../../src/application/identity/CreateOrganizationUseCase.js";
import { IssueOrganizationApiKeyUseCase } from "../../../src/application/identity/IssueOrganizationApiKeyUseCase.js";
import { IssueOrganizationInvitationUseCase } from "../../../src/application/identity/IssueOrganizationInvitationUseCase.js";
import { UpdateOrganizationMemberRoleUseCase } from "../../../src/application/identity/UpdateOrganizationMemberRoleUseCase.js";
import { ListPlacementCandidatesUseCase } from "../../../src/application/placement/ListPlacementCandidatesUseCase.js";
import { ResolveSyncPlacementUseCase } from "../../../src/application/placement/ResolveSyncPlacementUseCase.js";
import { EnrollProviderNodeUseCase } from "../../../src/application/provider/EnrollProviderNodeUseCase.js";
import { GetProviderNodeDetailUseCase } from "../../../src/application/provider/GetProviderNodeDetailUseCase.js";
import { IssueProviderNodeAttestationChallengeUseCase } from "../../../src/application/provider/IssueProviderNodeAttestationChallengeUseCase.js";
import { ListProviderBenchmarkHistoryUseCase } from "../../../src/application/provider/ListProviderBenchmarkHistoryUseCase.js";
import { ListProviderInventoryUseCase } from "../../../src/application/provider/ListProviderInventoryUseCase.js";
import { RecordProviderBenchmarkUseCase } from "../../../src/application/provider/RecordProviderBenchmarkUseCase.js";
import { SubmitProviderNodeAttestationUseCase } from "../../../src/application/provider/SubmitProviderNodeAttestationUseCase.js";
import { UpsertProviderNodeRoutingProfileUseCase } from "../../../src/application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import { ProviderNodeAttestationPolicy } from "../../../src/config/ProviderNodeAttestationPolicy.js";
import { StructuredConsoleAuditLog } from "../../../src/infrastructure/observability/StructuredConsoleAuditLog.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { NodeCryptoProviderNodeAttestationVerifier } from "../../../src/infrastructure/security/NodeCryptoProviderNodeAttestationVerifier.js";
import { buildApp } from "../../../src/interfaces/http/buildApp.js";

interface PgMemModule {
  Pool: new () => Pool;
}

const createOrganizationResponseSchema = z.object({
  organization: z.object({
    id: z.uuid()
  }),
  founder: z.object({
    userId: z.uuid()
  })
});

const issueApiKeyResponseSchema = z.object({
  secret: z.string()
});

const issueChallengeResponseSchema = z.object({
  challenge: z.object({
    id: z.uuid(),
    nonce: z.string(),
    expiresAt: z.iso.datetime()
  })
});

describe("provider node attestation routes", () => {
  let pool: Pool;

  beforeAll(async () => {
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const pgAdapter = database.adapters.createPg() as unknown as PgMemModule;
    pool = new pgAdapter.Pool();

    await new IdentitySchemaInitializer(pool).ensureSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("verifies attestation evidence, exposes effective trust tier, and filters placement by t2_attested", async () => {
    const attestationPolicy = ProviderNodeAttestationPolicy.createDefault();
    const app = createTestApp(
      pool,
      new Date("2026-03-10T10:01:00.000Z"),
      attestationPolicy
    );
    const provider = await createOrganization(app, {
      name: "Provider Attestation Org",
      slug: "provider-attestation-org",
      founderEmail: "provider-attestation-owner@example.com",
      founderDisplayName: "Provider Owner",
      accountCapabilities: ["provider"]
    });
    const buyer = await createOrganization(app, {
      name: "Buyer Attestation Org",
      slug: "buyer-attestation-org",
      founderEmail: "buyer-attestation-owner@example.com",
      founderDisplayName: "Buyer Owner",
      accountCapabilities: ["buyer"]
    });
    const providerApiKey = await issueApiKey(app, provider, "Provider runtime");
    const buyerApiKey = await issueApiKey(app, buyer, "Buyer placement");

    const enrolledNodeResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes`,
      headers: {
        "x-api-key": providerApiKey
      },
      payload: {
        machineId: "node-machine-attestation-0001",
        label: "Attested Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "attested-node.internal",
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
        }
      }
    });
    const enrolledNodeId = z
      .object({
        node: z.object({
          id: z.uuid()
        })
      })
      .parse(JSON.parse(enrolledNodeResponse.body)).node.id;

    await app.inject({
      method: "POST",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${enrolledNodeId}/benchmarks`,
      headers: {
        "x-api-key": providerApiKey
      },
      payload: {
        gpuClass: "NVIDIA A100",
        vramGb: 80,
        throughputTokensPerSecond: 742.5,
        driverVersion: "550.54.14"
      }
    });
    await app.inject({
      method: "PUT",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${enrolledNodeId}/routing-profile`,
      headers: {
        "x-api-key": providerApiKey
      },
      payload: {
        endpointUrl: "https://provider-runtime.example.com/v1/chat/completions",
        priceFloorUsdPerHour: 5.25
      }
    });

    const challengeResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${enrolledNodeId}/attestation-challenges`,
      headers: {
        "x-api-key": providerApiKey
      }
    });
    expect(challengeResponse.statusCode).toBe(201);
    const challenge = issueChallengeResponseSchema.parse(
      JSON.parse(challengeResponse.body)
    ).challenge;

    const evidence = createAttestationEvidence({
      challengeId: challenge.id,
      nonce: challenge.nonce,
      quotedAt: "2026-03-10T10:00:30.000Z",
      policy: attestationPolicy
    });
    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${enrolledNodeId}/attestations`,
      headers: {
        "x-api-key": providerApiKey
      },
      payload: {
        challengeId: challenge.id,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: evidence.attestationPublicKeyPem,
        quoteBase64: evidence.quoteBase64,
        pcrValues: evidence.pcrValues,
        secureBootEnabled: true
      }
    });
    expect(submitResponse.statusCode).toBe(201);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${enrolledNodeId}`,
      headers: {
        "x-api-key": providerApiKey
      }
    });
    const detailPayload = z
      .object({
        node: z.object({
          attestation: z.object({
            status: z.enum([
              "none",
              "pending",
              "verified",
              "expired",
              "failed"
            ]),
            effectiveTrustTier: z.enum([
              "t0_community",
              "t1_vetted",
              "t2_attested"
            ]),
            lastAttestedAt: z.iso.datetime().nullable(),
            attestationExpiresAt: z.iso.datetime().nullable(),
            attestationType: z.enum(["tpm_quote_v1"]).nullable()
          })
        })
      })
      .parse(JSON.parse(detailResponse.body));

    expect(detailPayload.node.attestation.status).toBe("verified");
    expect(detailPayload.node.attestation.effectiveTrustTier).toBe(
      "t2_attested"
    );

    const placementResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${buyer.organizationId}/environments/production/placement-candidates/preview`,
      headers: {
        "x-api-key": buyerApiKey
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t2_attested",
        maxPriceUsdPerHour: 10
      }
    });
    const placementPayload = z
      .object({
        candidates: z.array(
          z.object({
            providerNodeId: z.uuid(),
            trustTier: z.enum(["t0_community", "t1_vetted", "t2_attested"])
          })
        )
      })
      .parse(JSON.parse(placementResponse.body));

    expect(placementPayload.candidates).toHaveLength(1);
    expect(placementPayload.candidates[0]?.providerNodeId).toBe(enrolledNodeId);
    expect(placementPayload.candidates[0]?.trustTier).toBe("t2_attested");

    await app.close();

    const staleApp = createTestApp(
      pool,
      new Date("2026-03-11T11:00:00.000Z"),
      attestationPolicy
    );
    const stalePlacementResponse = await staleApp.inject({
      method: "POST",
      url: `/v1/organizations/${buyer.organizationId}/environments/production/placement-candidates/preview`,
      headers: {
        "x-api-key": buyerApiKey
      },
      payload: {
        gpuClass: "NVIDIA A100",
        minVramGb: 80,
        region: "eu-central-1",
        minimumTrustTier: "t2_attested",
        maxPriceUsdPerHour: 10
      }
    });
    const stalePlacementPayload = z
      .object({
        candidates: z.array(z.object({ providerNodeId: z.uuid() }))
      })
      .parse(JSON.parse(stalePlacementResponse.body));

    expect(stalePlacementPayload.candidates).toHaveLength(0);
    await staleApp.close();
  });

  it("rejects expired attestation challenges", async () => {
    const attestationPolicy = ProviderNodeAttestationPolicy.createDefault();
    const issueApp = createTestApp(
      pool,
      new Date("2026-03-10T10:00:00.000Z"),
      attestationPolicy
    );
    const provider = await createOrganization(issueApp, {
      name: "Expired Challenge Org",
      slug: "expired-challenge-org",
      founderEmail: "expired-challenge-owner@example.com",
      founderDisplayName: "Expired Challenge Owner",
      accountCapabilities: ["provider"]
    });
    const providerApiKey = await issueApiKey(
      issueApp,
      provider,
      "Provider attestation"
    );

    const enrollResponse = await issueApp.inject({
      method: "POST",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes`,
      headers: {
        "x-api-key": providerApiKey
      },
      payload: {
        machineId: "node-machine-attestation-0002",
        label: "Expired Challenge Node",
        runtime: "linux",
        region: "eu-central-1",
        hostname: "expired-node.internal",
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
        }
      }
    });
    const providerNodeId = z
      .object({
        node: z.object({
          id: z.uuid()
        })
      })
      .parse(JSON.parse(enrollResponse.body)).node.id;

    const challengeResponse = await issueApp.inject({
      method: "POST",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${providerNodeId}/attestation-challenges`,
      headers: {
        "x-api-key": providerApiKey
      }
    });
    const challenge = issueChallengeResponseSchema.parse(
      JSON.parse(challengeResponse.body)
    ).challenge;
    await issueApp.close();

    const expiredApp = createTestApp(
      pool,
      new Date("2026-03-10T10:06:00.000Z"),
      attestationPolicy
    );
    const evidence = createAttestationEvidence({
      challengeId: challenge.id,
      nonce: challenge.nonce,
      quotedAt: "2026-03-10T10:05:30.000Z",
      policy: attestationPolicy
    });
    const response = await expiredApp.inject({
      method: "POST",
      url: `/v1/organizations/${provider.organizationId}/environments/production/provider-nodes/${providerNodeId}/attestations`,
      headers: {
        "x-api-key": providerApiKey
      },
      payload: {
        challengeId: challenge.id,
        attestationType: "tpm_quote_v1",
        attestationPublicKeyPem: evidence.attestationPublicKeyPem,
        quoteBase64: evidence.quoteBase64,
        pcrValues: evidence.pcrValues,
        secureBootEnabled: true
      }
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body)).toMatchObject({
      error: "PROVIDER_NODE_ATTESTATION_CHALLENGE_EXPIRED"
    });
    await expiredApp.close();
  });
});

function createTestApp(
  pool: Pool,
  now: Date,
  attestationPolicy: ProviderNodeAttestationPolicy
) {
  const repository = new PostgresIdentityRepository(pool, () => now);
  const auditLog = new StructuredConsoleAuditLog();
  const issueOrganizationInvitationUseCase =
    new IssueOrganizationInvitationUseCase(
      repository,
      auditLog,
      () => now,
      () => "unused-attestation-token"
    );

  return buildApp({
    createOrganizationUseCase: new CreateOrganizationUseCase(
      repository,
      auditLog,
      () => now
    ),
    issueOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase:
      new AcceptOrganizationInvitationUseCase(repository, auditLog, () => now),
    updateOrganizationMemberRoleUseCase:
      new UpdateOrganizationMemberRoleUseCase(repository, auditLog, () => now),
    issueOrganizationApiKeyUseCase: new IssueOrganizationApiKeyUseCase(
      repository,
      repository,
      auditLog,
      () => now,
      () => `csk_attestation_${randomUUID()}`
    ),
    authenticateOrganizationApiKeyUseCase:
      new AuthenticateOrganizationApiKeyUseCase(
        repository,
        auditLog,
        () => now
      ),
    recordCustomerChargeUseCase: new RecordCustomerChargeUseCase(
      repository,
      auditLog,
      () => now
    ),
    recordCompletedJobSettlementUseCase:
      new RecordCompletedJobSettlementUseCase(repository, auditLog, () => now),
    getStagedPayoutExportUseCase: new GetStagedPayoutExportUseCase(repository),
    getOrganizationWalletSummaryUseCase:
      new GetOrganizationWalletSummaryUseCase(repository),
    getConsumerDashboardOverviewUseCase:
      new GetConsumerDashboardOverviewUseCase(repository, auditLog, () => now),
    getProviderDashboardOverviewUseCase:
      new GetProviderDashboardOverviewUseCase(repository, auditLog, () => now),
    executeChatCompletionUseCase: {
      execute: () => Promise.reject(new Error("unused gateway path"))
    },
    listPlacementCandidatesUseCase: new ListPlacementCandidatesUseCase(
      repository
    ),
    resolveSyncPlacementUseCase: new ResolveSyncPlacementUseCase(
      repository,
      auditLog,
      () => now
    ),
    enrollProviderNodeUseCase: new EnrollProviderNodeUseCase(
      repository,
      auditLog,
      () => now
    ),
    recordProviderBenchmarkUseCase: new RecordProviderBenchmarkUseCase(
      repository,
      auditLog,
      () => now
    ),
    listProviderInventoryUseCase: new ListProviderInventoryUseCase(repository),
    getProviderNodeDetailUseCase: new GetProviderNodeDetailUseCase(repository),
    issueProviderNodeAttestationChallengeUseCase:
      new IssueProviderNodeAttestationChallengeUseCase(
        repository,
        attestationPolicy,
        auditLog,
        () => now,
        () => "abcdefghijklmnopqrstuvwxyzABCDEFG123456"
      ),
    submitProviderNodeAttestationUseCase:
      new SubmitProviderNodeAttestationUseCase(
        repository,
        new NodeCryptoProviderNodeAttestationVerifier(attestationPolicy),
        attestationPolicy,
        auditLog,
        () => now
      ),
    upsertProviderNodeRoutingProfileUseCase:
      new UpsertProviderNodeRoutingProfileUseCase(
        repository,
        auditLog,
        () => now
      ),
    listProviderBenchmarkHistoryUseCase:
      new ListProviderBenchmarkHistoryUseCase(repository),
    admitProviderRuntimeWorkloadBundleUseCase: {
      execute: () => Promise.reject(new Error("unused runtime admission path"))
    }
  });
}

async function createOrganization(
  app: ReturnType<typeof createTestApp>,
  input: {
    name: string;
    slug: string;
    founderEmail: string;
    founderDisplayName: string;
    accountCapabilities: readonly ("buyer" | "provider")[];
  }
) {
  const response = await app.inject({
    method: "POST",
    url: "/v1/organizations",
    payload: {
      name: input.name,
      slug: input.slug,
      founder: {
        email: input.founderEmail,
        displayName: input.founderDisplayName
      },
      accountCapabilities: input.accountCapabilities
    }
  });

  const payload = createOrganizationResponseSchema.parse(
    JSON.parse(response.body)
  );

  return {
    organizationId: payload.organization.id,
    founderUserId: payload.founder.userId
  };
}

async function issueApiKey(
  app: ReturnType<typeof createTestApp>,
  organization: { organizationId: string; founderUserId: string },
  label: string
) {
  const response = await app.inject({
    method: "POST",
    url: `/v1/organizations/${organization.organizationId}/api-keys`,
    payload: {
      actorUserId: organization.founderUserId,
      label,
      environment: "production"
    }
  });

  return issueApiKeyResponseSchema.parse(JSON.parse(response.body)).secret;
}

function createAttestationEvidence(input: {
  challengeId: string;
  nonce: string;
  quotedAt: string;
  policy: ProviderNodeAttestationPolicy;
}) {
  const keyPair = generateKeyPairSync("ec", {
    namedCurve: "P-256"
  });
  const attestationPublicKeyPem = keyPair.publicKey.export({
    type: "spki",
    format: "pem"
  });
  const pcrValues = Object.fromEntries(
    Object.entries(input.policy.allowedPcrValues).map(([index, values]) => [
      index,
      values[0] ?? ""
    ])
  );
  const attestationPublicKeyFingerprint = createHash("sha256")
    .update(keyPair.publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
  const pcrDigestHex = createHash("sha256")
    .update(
      Object.entries(pcrValues)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([index, value]) => `${index}:${value}`)
        .join("|"),
      "utf8"
    )
    .digest("hex");
  const message = JSON.stringify({
    challengeId: input.challengeId,
    nonce: input.nonce,
    quotedAt: input.quotedAt,
    secureBootEnabled: true,
    pcrDigestHex
  });
  const signatureBase64 = signPayload(
    "sha256",
    Buffer.from(message, "utf8"),
    keyPair.privateKey
  ).toString("base64");

  return {
    attestationPublicKeyPem: attestationPublicKeyPem.toString(),
    quoteBase64: Buffer.from(
      JSON.stringify({
        challengeId: input.challengeId,
        nonce: input.nonce,
        quotedAt: input.quotedAt,
        secureBootEnabled: true,
        pcrDigestHex,
        attestationPublicKeyFingerprint,
        signatureBase64
      }),
      "utf8"
    ).toString("base64"),
    pcrValues
  };
}
