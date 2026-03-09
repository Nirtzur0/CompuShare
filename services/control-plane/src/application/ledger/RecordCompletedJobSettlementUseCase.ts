import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canManageOrganizationFinances } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import { LedgerPosting } from "../../domain/ledger/LedgerPosting.js";
import { LedgerTransaction } from "../../domain/ledger/LedgerTransaction.js";
import { UsdAmount } from "../../domain/ledger/UsdAmount.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import {
  BuyerCapabilityRequiredError,
  LedgerInsufficientPrepaidBalanceError,
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError,
  ProviderCapabilityRequiredError
} from "./LedgerErrors.js";
import type { OrganizationLedgerRepository } from "./ports/OrganizationLedgerRepository.js";

export interface RecordCompletedJobSettlementRequest {
  organizationId: string;
  actorUserId: string;
  providerOrganizationId: string;
  providerPayableUsd: string;
  platformRevenueUsd: string;
  reserveHoldbackUsd: string;
  jobReference: string;
  occurredAt?: string;
}

export interface RecordCompletedJobSettlementResponse {
  transaction: {
    id: string;
    organizationId: string;
    transactionType: string;
    reference: string;
    createdByUserId: string;
    occurredAt: string;
    postings: {
      accountCode: string;
      direction: "debit" | "credit";
      amountUsd: string;
      organizationId: string | null;
    }[];
  };
  walletSummary: {
    organizationId: string;
    usageBalanceUsd: string;
    spendCreditsUsd: string;
    pendingEarningsUsd: string;
    withdrawableCashUsd: string;
  };
}

export class RecordCompletedJobSettlementUseCase {
  public constructor(
    private readonly repository: OrganizationLedgerRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: RecordCompletedJobSettlementRequest
  ): Promise<RecordCompletedJobSettlementResponse> {
    const recordedAt = request.occurredAt
      ? new Date(request.occurredAt)
      : this.clock();
    const buyerOrganizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const providerOrganizationId = OrganizationId.create(
      request.providerOrganizationId
    );
    const providerPayable = UsdAmount.parse(request.providerPayableUsd);
    const platformRevenue = UsdAmount.parse(request.platformRevenueUsd);
    const reserveHoldback = UsdAmount.parse(request.reserveHoldbackUsd);
    const settlementTotal = providerPayable
      .add(platformRevenue)
      .add(reserveHoldback);

    const buyerCapabilities =
      await this.repository.findOrganizationAccountCapabilities(
        buyerOrganizationId
      );

    if (buyerCapabilities === null) {
      throw new LedgerOrganizationNotFoundError(buyerOrganizationId.value);
    }

    if (!buyerCapabilities.includes("buyer")) {
      throw new BuyerCapabilityRequiredError();
    }

    const actorMembership = await this.repository.findOrganizationMember(
      buyerOrganizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canManageOrganizationFinances(actorMembership.role)
    ) {
      throw new OrganizationFinanceAuthorizationError();
    }

    const providerCapabilities =
      await this.repository.findOrganizationAccountCapabilities(
        providerOrganizationId
      );

    if (providerCapabilities === null) {
      throw new LedgerOrganizationNotFoundError(providerOrganizationId.value);
    }

    if (!providerCapabilities.includes("provider")) {
      throw new ProviderCapabilityRequiredError();
    }

    const buyerWalletSummary =
      await this.repository.getOrganizationWalletSummary(buyerOrganizationId);

    if (settlementTotal.cents > buyerWalletSummary.usageBalance.cents) {
      throw new LedgerInsufficientPrepaidBalanceError(
        settlementTotal.toUsdString(),
        buyerWalletSummary.usageBalance.toUsdString()
      );
    }

    const transaction = LedgerTransaction.record({
      organizationId: buyerOrganizationId.value,
      transactionType: "job_settlement",
      reference: request.jobReference,
      createdByUserId: actorUserId.value,
      occurredAt: recordedAt,
      postings: [
        LedgerPosting.create({
          accountCode: "customer_prepaid_cash_liability",
          direction: "debit",
          amount: settlementTotal,
          organizationId: buyerOrganizationId.value
        }),
        LedgerPosting.create({
          accountCode: "provider_payable",
          direction: "credit",
          amount: providerPayable,
          organizationId: providerOrganizationId.value
        }),
        LedgerPosting.create({
          accountCode: "platform_revenue",
          direction: "credit",
          amount: platformRevenue
        }),
        LedgerPosting.create({
          accountCode: "risk_reserve",
          direction: "credit",
          amount: reserveHoldback,
          organizationId: providerOrganizationId.value
        })
      ]
    });

    await this.repository.appendLedgerTransaction(transaction);
    const updatedBuyerWalletSummary =
      await this.repository.getOrganizationWalletSummary(buyerOrganizationId);

    await this.auditLog.record({
      eventName: "finance.job_settlement.recorded",
      occurredAt: recordedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: buyerOrganizationId.value,
      metadata: {
        ledgerTransactionId: transaction.id,
        jobReference: request.jobReference,
        providerOrganizationId: providerOrganizationId.value,
        providerPayableUsd: providerPayable.toUsdString(),
        platformRevenueUsd: platformRevenue.toUsdString(),
        reserveHoldbackUsd: reserveHoldback.toUsdString(),
        usageBalanceUsd: updatedBuyerWalletSummary.usageBalance.toUsdString()
      }
    });

    return {
      transaction: transaction.toSnapshot(),
      walletSummary: updatedBuyerWalletSummary.toSnapshot()
    };
  }
}
