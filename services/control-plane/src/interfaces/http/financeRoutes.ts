import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GetOrganizationWalletSummaryUseCase } from "../../application/ledger/GetOrganizationWalletSummaryUseCase.js";
import type { GetStagedPayoutExportUseCase } from "../../application/ledger/GetStagedPayoutExportUseCase.js";
import type { GetProviderPayoutAccountStatusUseCase } from "../../application/payout/GetProviderPayoutAccountStatusUseCase.js";
import type { GetProviderPayoutAvailabilityUseCase } from "../../application/payout/GetProviderPayoutAvailabilityUseCase.js";
import type { IssueProviderPayoutOnboardingLinkUseCase } from "../../application/payout/IssueProviderPayoutOnboardingLinkUseCase.js";
import type { CreateProviderDisputeUseCase } from "../../application/dispute/CreateProviderDisputeUseCase.js";
import type { ListProviderDisputesUseCase } from "../../application/dispute/ListProviderDisputesUseCase.js";
import type { RecordProviderDisputeAllocationsUseCase } from "../../application/dispute/RecordProviderDisputeAllocationsUseCase.js";
import type { TransitionProviderDisputeStatusUseCase } from "../../application/dispute/TransitionProviderDisputeStatusUseCase.js";
import { ProviderPayoutAccountNotFoundError } from "../../application/payout/PayoutErrors.js";
import {
  ProviderDisputeAuthorizationError,
  ProviderDisputeBuyerCapabilityRequiredError,
  ProviderDisputeCaseNotFoundError,
  ProviderDisputeOrganizationNotFoundError,
  ProviderDisputePaymentReferenceNotFoundError,
  ProviderDisputeProviderCapabilityRequiredError,
  ProviderDisputeSettlementNotFoundError,
} from "../../application/dispute/ProviderDisputeErrors.js";
import {
  BuyerCapabilityRequiredError,
  LedgerInsufficientPrepaidBalanceError,
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError,
  ProviderCapabilityRequiredError
} from "../../application/ledger/LedgerErrors.js";
import type { RecordCompletedJobSettlementUseCase } from "../../application/ledger/RecordCompletedJobSettlementUseCase.js";
import type { RecordCustomerChargeUseCase } from "../../application/ledger/RecordCustomerChargeUseCase.js";
import { DomainValidationError } from "../../domain/identity/DomainValidationError.js";

const financeRouteParamsSchema = z.object({
  organizationId: z.uuid()
});

const customerChargeRequestSchema = z.object({
  actorUserId: z.uuid(),
  amountUsd: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/u),
  paymentReference: z.string().trim().min(3).max(120)
});

const jobSettlementRequestSchema = z.object({
  actorUserId: z.uuid(),
  providerOrganizationId: z.uuid(),
  providerPayableUsd: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/u),
  platformRevenueUsd: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/u),
  reserveHoldbackUsd: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/u),
  jobReference: z.string().trim().min(3).max(120)
});

const walletSummaryQuerySchema = z.object({
  actorUserId: z.uuid()
});

const providerPayoutOnboardingLinkRequestSchema = z.object({
  actorUserId: z.uuid()
});

const providerDisputeRequestSchema = z.discriminatedUnion("disputeType", [
  z.object({
    actorUserId: z.uuid(),
    disputeType: z.literal("settlement"),
    providerOrganizationId: z.uuid(),
    jobReference: z.string().trim().min(3).max(120),
    disputedAmountUsd: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/u),
    reasonCode: z.string().trim().min(2).max(80),
    summary: z.string().trim().min(5).max(500),
    evidenceEntries: z
      .array(
        z.object({
          label: z.string().trim().min(2).max(80),
          value: z.string().trim().min(1).max(500)
        })
      )
      .min(1)
  }),
  z.object({
    actorUserId: z.uuid(),
    disputeType: z.literal("chargeback"),
    paymentReference: z.string().trim().min(3).max(120),
    disputedAmountUsd: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/u),
    reasonCode: z.string().trim().min(2).max(80),
    summary: z.string().trim().min(5).max(500),
    evidenceEntries: z
      .array(
        z.object({
          label: z.string().trim().min(2).max(80),
          value: z.string().trim().min(1).max(500)
        })
      )
      .min(1)
  })
]);

const providerDisputeListQuerySchema = z.object({
  actorUserId: z.uuid(),
  status: z
    .enum(["open", "under_review", "won", "lost", "recovered", "canceled"])
    .optional()
});

const providerDisputeParamsSchema = z.object({
  organizationId: z.uuid(),
  disputeId: z.uuid()
});

const providerDisputeAllocationsRequestSchema = z.object({
  actorUserId: z.uuid(),
  allocations: z
    .array(
      z.object({
        providerOrganizationId: z.uuid(),
        amountUsd: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/u)
      })
    )
    .min(1)
});

const providerDisputeStatusRequestSchema = z.object({
  actorUserId: z.uuid(),
  nextStatus: z.enum([
    "open",
    "under_review",
    "won",
    "lost",
    "recovered",
    "canceled"
  ])
});

export function registerFinanceRoutes(
  app: FastifyInstance,
  recordCustomerChargeUseCase: Pick<RecordCustomerChargeUseCase, "execute">,
  recordCompletedJobSettlementUseCase: Pick<
    RecordCompletedJobSettlementUseCase,
    "execute"
  >,
  getStagedPayoutExportUseCase: Pick<GetStagedPayoutExportUseCase, "execute">,
  getOrganizationWalletSummaryUseCase: Pick<
    GetOrganizationWalletSummaryUseCase,
    "execute"
  >,
  issueProviderPayoutOnboardingLinkUseCase?: Pick<
    IssueProviderPayoutOnboardingLinkUseCase,
    "execute"
  >,
  getProviderPayoutAccountStatusUseCase?: Pick<
    GetProviderPayoutAccountStatusUseCase,
    "execute"
  >,
  getProviderPayoutAvailabilityUseCase?: Pick<
    GetProviderPayoutAvailabilityUseCase,
    "execute"
  >,
  createProviderDisputeUseCase?: Pick<CreateProviderDisputeUseCase, "execute">,
  listProviderDisputesUseCase?: Pick<ListProviderDisputesUseCase, "execute">,
  recordProviderDisputeAllocationsUseCase?: Pick<
    RecordProviderDisputeAllocationsUseCase,
    "execute"
  >,
  transitionProviderDisputeStatusUseCase?: Pick<
    TransitionProviderDisputeStatusUseCase,
    "execute"
  >
): void {
  app.post(
    "/v1/organizations/:organizationId/finance/customer-charges",
    async (request, reply) => {
      const parsedParams = financeRouteParamsSchema.safeParse(request.params);
      const parsedBody = customerChargeRequestSchema.safeParse(request.body);

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

      try {
        const response = await recordCustomerChargeUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedBody.data.actorUserId,
          amountUsd: parsedBody.data.amountUsd,
          paymentReference: parsedBody.data.paymentReference
        });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof LedgerOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "LEDGER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof BuyerCapabilityRequiredError) {
          return reply.status(403).send({
            error: "BUYER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof OrganizationFinanceAuthorizationError) {
          return reply.status(403).send({
            error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.post(
    "/v1/organizations/:organizationId/finance/job-settlements",
    async (request, reply) => {
      const parsedParams = financeRouteParamsSchema.safeParse(request.params);
      const parsedBody = jobSettlementRequestSchema.safeParse(request.body);

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

      try {
        const response = await recordCompletedJobSettlementUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedBody.data.actorUserId,
          providerOrganizationId: parsedBody.data.providerOrganizationId,
          providerPayableUsd: parsedBody.data.providerPayableUsd,
          platformRevenueUsd: parsedBody.data.platformRevenueUsd,
          reserveHoldbackUsd: parsedBody.data.reserveHoldbackUsd,
          jobReference: parsedBody.data.jobReference
        });

        return await reply.status(201).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof LedgerOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "LEDGER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof BuyerCapabilityRequiredError) {
          return reply.status(403).send({
            error: "BUYER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof OrganizationFinanceAuthorizationError) {
          return reply.status(403).send({
            error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof ProviderCapabilityRequiredError) {
          return reply.status(409).send({
            error: "PROVIDER_CAPABILITY_REQUIRED",
            message: error.message
          });
        }

        if (error instanceof LedgerInsufficientPrepaidBalanceError) {
          return reply.status(409).send({
            error: "LEDGER_INSUFFICIENT_PREPAID_BALANCE",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/finance/payout-exports/staged",
    async (request, reply) => {
      const parsedParams = financeRouteParamsSchema.safeParse(request.params);
      const parsedQuery = walletSummaryQuerySchema.safeParse(request.query);

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedQuery.error.issues[0]?.message ?? "Invalid request."
        });
      }

      try {
        const response = await getStagedPayoutExportUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof LedgerOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "LEDGER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof OrganizationFinanceAuthorizationError) {
          return reply.status(403).send({
            error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  app.get(
    "/v1/organizations/:organizationId/finance/wallet",
    async (request, reply) => {
      const parsedParams = financeRouteParamsSchema.safeParse(request.params);
      const parsedQuery = walletSummaryQuerySchema.safeParse(request.query);

      if (!parsedParams.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedParams.error.issues[0]?.message ?? "Invalid request."
        });
      }

      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: parsedQuery.error.issues[0]?.message ?? "Invalid request."
        });
      }

      try {
        const response = await getOrganizationWalletSummaryUseCase.execute({
          organizationId: parsedParams.data.organizationId,
          actorUserId: parsedQuery.data.actorUserId
        });

        return await reply.status(200).send(response);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return reply.status(400).send({
            error: "DOMAIN_VALIDATION_ERROR",
            message: error.message
          });
        }

        if (error instanceof LedgerOrganizationNotFoundError) {
          return reply.status(404).send({
            error: "LEDGER_ORGANIZATION_NOT_FOUND",
            message: error.message
          });
        }

        if (error instanceof OrganizationFinanceAuthorizationError) {
          return reply.status(403).send({
            error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
            message: error.message
          });
        }

        throw error;
      }
    }
  );

  if (
    createProviderDisputeUseCase !== undefined &&
    listProviderDisputesUseCase !== undefined &&
    recordProviderDisputeAllocationsUseCase !== undefined &&
    transitionProviderDisputeStatusUseCase !== undefined
  ) {
    app.post(
      "/v1/organizations/:organizationId/finance/provider-disputes",
      async (request, reply) => {
        const parsedParams = financeRouteParamsSchema.safeParse(request.params);
        const parsedBody = providerDisputeRequestSchema.safeParse(request.body);

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

        try {
          const response = await createProviderDisputeUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            ...parsedBody.data
          });

          return await reply.status(201).send(response);
        } catch (error) {
          return handleFinanceError(reply, error);
        }
      }
    );

    app.get(
      "/v1/organizations/:organizationId/finance/provider-disputes",
      async (request, reply) => {
        const parsedParams = financeRouteParamsSchema.safeParse(request.params);
        const parsedQuery = providerDisputeListQuerySchema.safeParse(request.query);

        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedParams.error.issues[0]?.message ?? "Invalid request."
          });
        }

        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedQuery.error.issues[0]?.message ?? "Invalid request."
          });
        }

        try {
          const response = await listProviderDisputesUseCase.execute(
            parsedQuery.data.status === undefined
              ? {
                  organizationId: parsedParams.data.organizationId,
                  actorUserId: parsedQuery.data.actorUserId
                }
              : {
                  organizationId: parsedParams.data.organizationId,
                  actorUserId: parsedQuery.data.actorUserId,
                  status: parsedQuery.data.status
                }
          );

          return await reply.status(200).send(response);
        } catch (error) {
          return handleFinanceError(reply, error);
        }
      }
    );

    app.post(
      "/v1/organizations/:organizationId/finance/provider-disputes/:disputeId/allocations",
      async (request, reply) => {
        const parsedParams = providerDisputeParamsSchema.safeParse(request.params);
        const parsedBody =
          providerDisputeAllocationsRequestSchema.safeParse(request.body);

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

        try {
          const response =
            await recordProviderDisputeAllocationsUseCase.execute({
              organizationId: parsedParams.data.organizationId,
              disputeId: parsedParams.data.disputeId,
              actorUserId: parsedBody.data.actorUserId,
              allocations: parsedBody.data.allocations
            });

          return await reply.status(200).send(response);
        } catch (error) {
          return handleFinanceError(reply, error);
        }
      }
    );

    app.post(
      "/v1/organizations/:organizationId/finance/provider-disputes/:disputeId/status",
      async (request, reply) => {
        const parsedParams = providerDisputeParamsSchema.safeParse(request.params);
        const parsedBody =
          providerDisputeStatusRequestSchema.safeParse(request.body);

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

        try {
          const response = await transitionProviderDisputeStatusUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            disputeId: parsedParams.data.disputeId,
            actorUserId: parsedBody.data.actorUserId,
            nextStatus: parsedBody.data.nextStatus
          });

          return await reply.status(200).send(response);
        } catch (error) {
          return handleFinanceError(reply, error);
        }
      }
    );
  }

  if (
    issueProviderPayoutOnboardingLinkUseCase !== undefined &&
    getProviderPayoutAccountStatusUseCase !== undefined &&
    getProviderPayoutAvailabilityUseCase !== undefined
  ) {
    app.post(
      "/v1/organizations/:organizationId/finance/provider-payout-accounts/onboarding-links",
      async (request, reply) => {
        const parsedParams = financeRouteParamsSchema.safeParse(request.params);
        const parsedBody = providerPayoutOnboardingLinkRequestSchema.safeParse(
          request.body
        );

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

        try {
          const response =
            await issueProviderPayoutOnboardingLinkUseCase.execute({
              organizationId: parsedParams.data.organizationId,
              actorUserId: parsedBody.data.actorUserId
            });

          return await reply.status(201).send(response);
        } catch (error) {
          return handleFinanceError(reply, error);
        }
      }
    );

    app.get(
      "/v1/organizations/:organizationId/finance/provider-payout-accounts/current",
      async (request, reply) => {
        const parsedParams = financeRouteParamsSchema.safeParse(request.params);
        const parsedQuery = walletSummaryQuerySchema.safeParse(request.query);

        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedParams.error.issues[0]?.message ?? "Invalid request."
          });
        }

        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedQuery.error.issues[0]?.message ?? "Invalid request."
          });
        }

        try {
          const response = await getProviderPayoutAccountStatusUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            actorUserId: parsedQuery.data.actorUserId
          });

          return await reply.status(200).send(response);
        } catch (error) {
          return handleFinanceError(reply, error);
        }
      }
    );

    app.get(
      "/v1/organizations/:organizationId/finance/provider-payout-availability",
      async (request, reply) => {
        const parsedParams = financeRouteParamsSchema.safeParse(request.params);
        const parsedQuery = walletSummaryQuerySchema.safeParse(request.query);

        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedParams.error.issues[0]?.message ?? "Invalid request."
          });
        }

        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: parsedQuery.error.issues[0]?.message ?? "Invalid request."
          });
        }

        try {
          const response = await getProviderPayoutAvailabilityUseCase.execute({
            organizationId: parsedParams.data.organizationId,
            actorUserId: parsedQuery.data.actorUserId
          });

          return await reply.status(200).send(response);
        } catch (error) {
          return handleFinanceError(reply, error);
        }
      }
    );
  }
}

function handleFinanceError(
  reply: {
    status(code: number): { send(payload: Record<string, unknown>): unknown };
  },
  error: unknown
): unknown {
  if (error instanceof DomainValidationError) {
    return reply.status(400).send({
      error: "DOMAIN_VALIDATION_ERROR",
      message: error.message
    });
  }

  if (error instanceof LedgerOrganizationNotFoundError) {
    return reply.status(404).send({
      error: "LEDGER_ORGANIZATION_NOT_FOUND",
      message: error.message
    });
  }

  if (error instanceof ProviderDisputeOrganizationNotFoundError) {
    return reply.status(404).send({
      error: "PROVIDER_DISPUTE_ORGANIZATION_NOT_FOUND",
      message: error.message
    });
  }

  if (error instanceof OrganizationFinanceAuthorizationError) {
    return reply.status(403).send({
      error: "ORGANIZATION_FINANCE_AUTHORIZATION_ERROR",
      message: error.message
    });
  }

  if (error instanceof ProviderDisputeAuthorizationError) {
    return reply.status(403).send({
      error: "PROVIDER_DISPUTE_AUTHORIZATION_ERROR",
      message: error.message
    });
  }

  if (error instanceof ProviderDisputeBuyerCapabilityRequiredError) {
    return reply.status(403).send({
      error: "PROVIDER_DISPUTE_BUYER_CAPABILITY_REQUIRED",
      message: error.message
    });
  }

  if (error instanceof ProviderCapabilityRequiredError) {
    return reply.status(409).send({
      error: "PROVIDER_CAPABILITY_REQUIRED",
      message: error.message
    });
  }

  if (error instanceof ProviderDisputeProviderCapabilityRequiredError) {
    return reply.status(409).send({
      error: "PROVIDER_DISPUTE_PROVIDER_CAPABILITY_REQUIRED",
      message: error.message
    });
  }

  if (error instanceof ProviderPayoutAccountNotFoundError) {
    return reply.status(404).send({
      error: "PROVIDER_PAYOUT_ACCOUNT_NOT_FOUND",
      message: error.message
    });
  }

  if (error instanceof ProviderDisputeCaseNotFoundError) {
    return reply.status(404).send({
      error: "PROVIDER_DISPUTE_CASE_NOT_FOUND",
      message: error.message
    });
  }

  if (error instanceof ProviderDisputePaymentReferenceNotFoundError) {
    return reply.status(404).send({
      error: "PROVIDER_DISPUTE_PAYMENT_REFERENCE_NOT_FOUND",
      message: error.message
    });
  }

  if (error instanceof ProviderDisputeSettlementNotFoundError) {
    return reply.status(404).send({
      error: "PROVIDER_DISPUTE_SETTLEMENT_NOT_FOUND",
      message: error.message
    });
  }

  throw error;
}
