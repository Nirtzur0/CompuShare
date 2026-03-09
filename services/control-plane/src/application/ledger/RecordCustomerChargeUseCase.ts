import { OrganizationId } from "../../domain/identity/OrganizationId.js";
import { canManageOrganizationFinances } from "../../domain/identity/OrganizationRole.js";
import { UserId } from "../../domain/identity/UserId.js";
import { LedgerPosting } from "../../domain/ledger/LedgerPosting.js";
import { LedgerTransaction } from "../../domain/ledger/LedgerTransaction.js";
import { UsdAmount } from "../../domain/ledger/UsdAmount.js";
import type { AuditLog } from "../identity/ports/AuditLog.js";
import {
  BuyerCapabilityRequiredError,
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError
} from "./LedgerErrors.js";
import type { OrganizationLedgerRepository } from "./ports/OrganizationLedgerRepository.js";

export interface RecordCustomerChargeRequest {
  organizationId: string;
  actorUserId: string;
  amountUsd: string;
  paymentReference: string;
  occurredAt?: string;
}

export interface RecordCustomerChargeResponse {
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

export class RecordCustomerChargeUseCase {
  public constructor(
    private readonly repository: OrganizationLedgerRepository,
    private readonly auditLog: AuditLog,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public async execute(
    request: RecordCustomerChargeRequest
  ): Promise<RecordCustomerChargeResponse> {
    const recordedAt = request.occurredAt
      ? new Date(request.occurredAt)
      : this.clock();
    const organizationId = OrganizationId.create(request.organizationId);
    const actorUserId = UserId.create(request.actorUserId);
    const amount = UsdAmount.parse(request.amountUsd);
    const capabilities =
      await this.repository.findOrganizationAccountCapabilities(organizationId);

    if (capabilities === null) {
      throw new LedgerOrganizationNotFoundError(organizationId.value);
    }

    if (!capabilities.includes("buyer")) {
      throw new BuyerCapabilityRequiredError();
    }

    const actorMembership = await this.repository.findOrganizationMember(
      organizationId,
      actorUserId
    );

    if (
      actorMembership === null ||
      !canManageOrganizationFinances(actorMembership.role)
    ) {
      throw new OrganizationFinanceAuthorizationError();
    }

    const transaction = LedgerTransaction.record({
      organizationId: organizationId.value,
      transactionType: "customer_charge",
      reference: request.paymentReference,
      createdByUserId: actorUserId.value,
      occurredAt: recordedAt,
      postings: [
        LedgerPosting.create({
          accountCode: "platform_cash_clearing",
          direction: "debit",
          amount
        }),
        LedgerPosting.create({
          accountCode: "customer_prepaid_cash_liability",
          direction: "credit",
          amount,
          organizationId: organizationId.value
        })
      ]
    });

    await this.repository.appendLedgerTransaction(transaction);
    const walletSummary =
      await this.repository.getOrganizationWalletSummary(organizationId);

    await this.auditLog.record({
      eventName: "finance.customer_charge.recorded",
      occurredAt: recordedAt.toISOString(),
      actorUserId: actorUserId.value,
      organizationId: organizationId.value,
      metadata: {
        ledgerTransactionId: transaction.id,
        paymentReference: transaction.reference,
        amountUsd: amount.toUsdString(),
        usageBalanceUsd: walletSummary.usageBalance.toUsdString()
      }
    });

    return {
      transaction: transaction.toSnapshot(),
      walletSummary: walletSummary.toSnapshot()
    };
  }
}
