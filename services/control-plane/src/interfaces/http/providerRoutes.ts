import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  OrganizationApiKeyAuthenticationError,
  OrganizationApiKeyScopeMismatchError,
  type AuthenticateOrganizationApiKeyUseCase
} from "../../application/identity/AuthenticateOrganizationApiKeyUseCase.js";
import { type AdmitProviderRuntimeWorkloadBundleUseCase } from "../../application/provider/AdmitProviderRuntimeWorkloadBundleUseCase.js";
import {
  type EnrollProviderNodeUseCase,
  ProviderCapabilityRequiredError,
  ProviderNodeMachineConflictError,
  ProviderOrganizationNotFoundError
} from "../../application/provider/EnrollProviderNodeUseCase.js";
import {
  type GetProviderNodeDetailUseCase,
  ProviderNodeDetailCapabilityRequiredError,
  ProviderNodeDetailNotFoundError,
  ProviderNodeDetailOrganizationNotFoundError
} from "../../application/provider/GetProviderNodeDetailUseCase.js";
import {
  type IssueProviderNodeAttestationChallengeUseCase,
  ProviderNodeAttestationCapabilityRequiredError,
  ProviderNodeAttestationNodeNotFoundError,
  ProviderNodeAttestationOrganizationNotFoundError,
  ProviderNodeAttestationRuntimeUnsupportedError
} from "../../application/provider/IssueProviderNodeAttestationChallengeUseCase.js";
import {
  ProviderBenchmarkHistoryCapabilityRequiredError,
  ProviderBenchmarkHistoryNodeNotFoundError,
  ProviderBenchmarkHistoryOrganizationNotFoundError,
  type ListProviderBenchmarkHistoryUseCase
} from "../../application/provider/ListProviderBenchmarkHistoryUseCase.js";
import {
  ProviderBenchmarkCapabilityRequiredError,
  ProviderBenchmarkNodeNotFoundError,
  ProviderBenchmarkOrganizationNotFoundError,
  type RecordProviderBenchmarkUseCase
} from "../../application/provider/RecordProviderBenchmarkUseCase.js";
import {
  ProviderRoutingProfileCapabilityRequiredError,
  ProviderRoutingProfileNodeNotFoundError,
  ProviderRoutingProfileOrganizationNotFoundError,
  type UpsertProviderNodeRoutingProfileUseCase
} from "../../application/provider/UpsertProviderNodeRoutingProfileUseCase.js";
import {
  ProviderRoutingStateApprovedModelAliasNotFoundError,
  ProviderRoutingStateCapabilityRequiredError,
  ProviderRoutingStateNodeNotFoundError,
  ProviderRoutingStateOrganizationNotFoundError,
  type ReplaceProviderNodeRoutingStateUseCase
} from "../../application/provider/ReplaceProviderNodeRoutingStateUseCase.js";
import {
  ProviderInventoryCapabilityRequiredError,
  ProviderInventoryOrganizationNotFoundError,
  type ListProviderInventoryUseCase
} from "../../application/provider/ListProviderInventoryUseCase.js";
import {
  ProviderNodeAttestationChallengeAlreadyUsedError,
  ProviderNodeAttestationChallengeExpiredError,
  ProviderNodeAttestationChallengeNotFoundError,
  ProviderNodeAttestationVerificationFailedError,
  type SubmitProviderNodeAttestationUseCase
} from "../../application/provider/SubmitProviderNodeAttestationUseCase.js";
import { WorkloadBundleAdmissionRejectedError } from "../../application/workload/WorkloadBundleAdmissionRejectedError.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const enrollProviderNodeRequestSchema = z.object({
  machineId: z.string().min(8).max(128),
  label: z.string().min(3).max(120),
  runtime: z.enum(["linux", "kubernetes"]),
  region: z.string().min(2).max(64),
  hostname: z.string().min(2).max(255),
  inventory: z.object({
    driverVersion: z.string().min(3).max(64),
    gpus: z
      .array(
        z.object({
          model: z.string().min(2).max(120),
          vramGb: z.int().min(1).max(4096),
          count: z.int().min(1).max(1024),
          interconnect: z.string().min(2).max(120).nullable().optional()
        })
      )
      .min(1)
  })
});

const providerBenchmarkRequestSchema = z.object({
  gpuClass: z.string().min(2).max(120),
  vramGb: z.int().min(1).max(4096),
  throughputTokensPerSecond: z.number().positive().max(1_000_000),
  driverVersion: z.string().min(3).max(64)
});

const providerRoutingProfileRequestSchema = z.object({
  endpointUrl: z.url().startsWith("https://"),
  priceFloorUsdPerHour: z.number().positive().max(1_000_000)
});

const providerRoutingStateRequestSchema = z.object({
  warmModelAliases: z
    .array(
      z.object({
        approvedModelAlias: z.string().min(3).max(120),
        expiresAt: z.iso.datetime()
      })
    )
    .max(32)
});

const providerNodeAttestationRequestSchema = z.object({
  challengeId: z.uuid(),
  attestationType: z.enum(["tpm_quote_v1"]),
  attestationPublicKeyPem: z.string().min(32).max(8_192),
  quoteBase64: z.string().min(32).max(16_384),
  pcrValues: z
    .record(z.string(), z.string().regex(/^[A-Fa-f0-9]{64}$/))
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one PCR value is required."
    }),
  secureBootEnabled: z.boolean()
});

const runtimeAdmissionRequestSchema = z.object({
  expectedCustomerOrganizationId: z.uuid(),
  signedBundle: z.object({
    bundle: z.object({
      id: z.uuid(),
      modelManifestId: z.string().min(3).max(120),
      imageDigest: z.string().min(10).max(120),
      runtimeConfig: z.object({
        requestKind: z.string().min(3).max(64),
        streamingEnabled: z.boolean(),
        maxTokens: z.int().min(1).max(131_072),
        temperature: z.number().min(0).max(2).nullable(),
        topP: z.number().positive().max(1).nullable()
      }),
      networkPolicy: z.string().min(3).max(120),
      maxRuntimeSeconds: z.int().min(1).max(3_600),
      customerOrganizationId: z.uuid(),
      sensitivityClass: z.enum(["standard_business"]),
      createdAt: z.iso.datetime()
    }),
    signature: z.string().min(64).max(64),
    signatureKeyId: z.string().min(3).max(120)
  })
});

export function registerProviderRoutes(
  app: FastifyInstance,
  authenticateOrganizationApiKeyUseCase: Pick<
    AuthenticateOrganizationApiKeyUseCase,
    "execute"
  >,
  enrollProviderNodeUseCase: Pick<EnrollProviderNodeUseCase, "execute">,
  recordProviderBenchmarkUseCase: Pick<
    RecordProviderBenchmarkUseCase,
    "execute"
  >,
  listProviderInventoryUseCase: Pick<ListProviderInventoryUseCase, "execute">,
  getProviderNodeDetailUseCase: Pick<GetProviderNodeDetailUseCase, "execute">,
  issueProviderNodeAttestationChallengeUseCase: Pick<
    IssueProviderNodeAttestationChallengeUseCase,
    "execute"
  >,
  submitProviderNodeAttestationUseCase: Pick<
    SubmitProviderNodeAttestationUseCase,
    "execute"
  >,
  replaceProviderNodeRoutingStateUseCase:
    | Pick<ReplaceProviderNodeRoutingStateUseCase, "execute">
    | undefined,
  upsertProviderNodeRoutingProfileUseCase: Pick<
    UpsertProviderNodeRoutingProfileUseCase,
    "execute"
  >,
  listProviderBenchmarkHistoryUseCase: Pick<
    ListProviderBenchmarkHistoryUseCase,
    "execute"
  >,
  admitProviderRuntimeWorkloadBundleUseCase: Pick<
    AdmitProviderRuntimeWorkloadBundleUseCase,
    "execute"
  >
): void {
  app.get(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"])
        })
        .safeParse(request.params);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await listProviderInventoryUseCase.execute({
          organizationId: parsedParams.data.organizationId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderInventoryOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderInventoryCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"])
        })
        .safeParse(request.params);
      const parsedBody = enrollProviderNodeRequestSchema.safeParse(
        request.body
      );
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await enrollProviderNodeUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          machineId: parsedBody.data.machineId,
          label: parsedBody.data.label,
          runtime: parsedBody.data.runtime,
          region: parsedBody.data.region,
          hostname: parsedBody.data.hostname,
          inventory: {
            driverVersion: parsedBody.data.inventory.driverVersion,
            gpus: parsedBody.data.inventory.gpus.map((gpu) => ({
              model: gpu.model,
              vramGb: gpu.vramGb,
              count: gpu.count,
              interconnect: gpu.interconnect ?? null
            }))
          }
        });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeMachineConflictError) {
          return reply.status(409).send({
            error: "PROVIDER_NODE_MACHINE_CONFLICT",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          providerNodeId: z.uuid()
        })
        .safeParse(request.params);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await getProviderNodeDetailUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          providerNodeId: parsedParams.data.providerNodeId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeDetailOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeDetailCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeDetailNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_NOT_FOUND",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/attestation-challenges",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          providerNodeId: z.uuid()
        })
        .safeParse(request.params);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response =
          await issueProviderNodeAttestationChallengeUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            providerNodeId: parsedParams.data.providerNodeId
          });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationNodeNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationRuntimeUnsupportedError) {
          return reply.status(409).send({
            error: "PROVIDER_NODE_RUNTIME_UNSUPPORTED",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.put(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/routing-profile",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          providerNodeId: z.uuid()
        })
        .safeParse(request.params);
      const parsedBody = providerRoutingProfileRequestSchema.safeParse(
        request.body
      );
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await upsertProviderNodeRoutingProfileUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          providerNodeId: parsedParams.data.providerNodeId,
          endpointUrl: parsedBody.data.endpointUrl,
          priceFloorUsdPerHour: parsedBody.data.priceFloorUsdPerHour
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderRoutingProfileOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderRoutingProfileCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderRoutingProfileNodeNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_NOT_FOUND",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  if (replaceProviderNodeRoutingStateUseCase !== undefined) {
    app.put(
      "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/routing-state",
      async (request, reply) => {
        const parsedParams = z
          .object({
            organizationId: z.uuid(),
            environment: z.enum(["development", "staging", "production"]),
            providerNodeId: z.uuid()
          })
          .safeParse(request.params);
        const parsedBody = providerRoutingStateRequestSchema.safeParse(
          request.body
        );
        const apiKeyHeader = request.headers["x-api-key"];

        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedParams.error.issues[0]?.message ?? "Invalid request."
          });
        }

        if (!parsedBody.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedBody.error.issues[0]?.message ?? "Invalid request."
          });
        }

        if (
          typeof apiKeyHeader !== "string" ||
          apiKeyHeader.trim().length === 0
        ) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_MISSING",
            message: "An x-api-key header is required."
          });
        }

        try {
          await authenticateOrganizationApiKeyUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            environment: parsedParams.data.environment,
            secret: apiKeyHeader
          });

          const response = await replaceProviderNodeRoutingStateUseCase.execute(
            {
              organizationId: parsedParams.data.organizationId,
              providerNodeId: parsedParams.data.providerNodeId,
              warmModelAliases: parsedBody.data.warmModelAliases
            }
          );

          return await reply.status(200).send(response);
        } catch (error) {
          if (error instanceof DomainValidationError) {
            return reply.status(400).send({
              error: "DOMAIN_VALIDATION_ERROR",
              message: error.message
            });
          }

          if (error instanceof OrganizationApiKeyAuthenticationError) {
            return reply.status(401).send({
              error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
              message: error.message
            });
          }

          if (error instanceof OrganizationApiKeyScopeMismatchError) {
            return reply.status(403).send({
              error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
              message: error.message
            });
          }

          if (error instanceof ProviderRoutingStateOrganizationNotFoundError) {
            return reply.status(404).send({
              error: "PROVIDER_ORGANIZATION_NOT_FOUND",
              message: error.message
            });
          }

          if (error instanceof ProviderRoutingStateCapabilityRequiredError) {
            return reply.status(403).send({
              error: "PROVIDER_CAPABILITY_REQUIRED",
              message: error.message
            });
          }

          if (error instanceof ProviderRoutingStateNodeNotFoundError) {
            return reply.status(404).send({
              error: "PROVIDER_NODE_NOT_FOUND",
              message: error.message
            });
          }

          if (
            error instanceof ProviderRoutingStateApprovedModelAliasNotFoundError
          ) {
            return reply.status(404).send({
              error: "APPROVED_MODEL_ALIAS_NOT_FOUND",
              message: error.message
            });
          }

          throw error;
        }
      }
    );
  }

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/attestations",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          providerNodeId: z.uuid()
        })
        .safeParse(request.params);
      const parsedBody = providerNodeAttestationRequestSchema.safeParse(
        request.body
      );
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await submitProviderNodeAttestationUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          providerNodeId: parsedParams.data.providerNodeId,
          challengeId: parsedBody.data.challengeId,
          attestationType: parsedBody.data.attestationType,
          attestationPublicKeyPem: parsedBody.data.attestationPublicKeyPem,
          quoteBase64: parsedBody.data.quoteBase64,
          pcrValues: parsedBody.data.pcrValues,
          secureBootEnabled: parsedBody.data.secureBootEnabled
        });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationNodeNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationRuntimeUnsupportedError) {
          return reply.status(409).send({
            error: "PROVIDER_NODE_RUNTIME_UNSUPPORTED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationChallengeNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_ATTESTATION_CHALLENGE_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationChallengeExpiredError) {
          return reply.status(409).send({
            error: "PROVIDER_NODE_ATTESTATION_CHALLENGE_EXPIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationChallengeAlreadyUsedError) {
          return reply.status(409).send({
            error: "PROVIDER_NODE_ATTESTATION_CHALLENGE_ALREADY_USED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeAttestationVerificationFailedError) {
          return reply.status(422).send({
            error: "PROVIDER_NODE_ATTESTATION_VERIFICATION_FAILED",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/benchmarks",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          providerNodeId: z.uuid()
        })
        .safeParse(request.params);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await listProviderBenchmarkHistoryUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          providerNodeId: parsedParams.data.providerNodeId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (
          error instanceof ProviderBenchmarkHistoryOrganizationNotFoundError
        ) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderBenchmarkHistoryCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderBenchmarkHistoryNodeNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_NOT_FOUND",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/benchmarks",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          providerNodeId: z.uuid()
        })
        .safeParse(request.params);
      const parsedBody = providerBenchmarkRequestSchema.safeParse(request.body);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        await authenticateOrganizationApiKeyUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          environment: parsedParams.data.environment,
          secret: apiKeyHeader
        });

        const response = await recordProviderBenchmarkUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          providerNodeId: parsedParams.data.providerNodeId,
          gpuClass: parsedBody.data.gpuClass,
          vramGb: parsedBody.data.vramGb,
          throughputTokensPerSecond: parsedBody.data.throughputTokensPerSecond,
          driverVersion: parsedBody.data.driverVersion
        });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderBenchmarkOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderBenchmarkCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderBenchmarkNodeNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_NOT_FOUND",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/runtime-admissions",
    async (request, reply) => {
      const parsedParams = z
        .object({
          organizationId: z.uuid(),
          environment: z.enum(["development", "staging", "production"]),
          providerNodeId: z.uuid()
        })
        .safeParse(request.params);
      const parsedBody = runtimeAdmissionRequestSchema.safeParse(request.body);
      const apiKeyHeader = request.headers["x-api-key"];

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (
        typeof apiKeyHeader !== "string" ||
        apiKeyHeader.trim().length === 0
      ) {
        return reply.status(401).send({
          error: "ORGANIZATION_API_KEY_MISSING",
          message: "An x-api-key header is required."
        });
      }

      try {
        const authentication =
          await authenticateOrganizationApiKeyUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            environment: parsedParams.data.environment,
            secret: apiKeyHeader
          });

        const response =
          await admitProviderRuntimeWorkloadBundleUseCase.execute({
            actorUserId: authentication.apiKey.issuedByUserId,
            organizationId: parsedParams.data.organizationId,
            environment: parsedParams.data.environment,
            providerNodeId: parsedParams.data.providerNodeId,
            expectedCustomerOrganizationId:
              parsedBody.data.expectedCustomerOrganizationId,
            signedBundle: parsedBody.data.signedBundle
          });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyAuthenticationError) {
          return reply.status(401).send({
            error: "ORGANIZATION_API_KEY_AUTHENTICATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof OrganizationApiKeyScopeMismatchError) {
          return reply.status(403).send({
            error: "ORGANIZATION_API_KEY_SCOPE_MISMATCH",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeDetailOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeDetailCapabilityRequiredError) {
          return reply.status(403).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof ProviderNodeDetailNotFoundError) {
          return reply.status(404).send({
            error: "PROVIDER_NODE_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof WorkloadBundleAdmissionRejectedError) {
          return reply.status(403).send({
            error: "WORKLOAD_BUNDLE_ADMISSION_REJECTED",
            message: error.message
          });
        }

        throw error;
      }
    }
  );
}
