import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GetOrganizationWalletSummaryUseCase } from "../../application/ledger/GetOrganizationWalletSummaryUseCase.js";
import type { GetStagedPayoutExportUseCase } from "../../application/ledger/GetStagedPayoutExportUseCase.js";
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
}
