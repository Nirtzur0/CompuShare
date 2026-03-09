import { describe, expect, it } from "vitest";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import type { LedgerTransaction } from "../../../src/domain/ledger/LedgerTransaction.js";
import { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";
import type { StagedPayoutExport } from "../../../src/domain/ledger/StagedPayoutExport.js";
import {
  BuyerCapabilityRequiredError,
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError
} from "../../../src/application/ledger/LedgerErrors.js";
import { RecordCustomerChargeUseCase } from "../../../src/application/ledger/RecordCustomerChargeUseCase.js";
import type { OrganizationLedgerRepository } from "../../../src/application/ledger/ports/OrganizationLedgerRepository.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";

class InMemoryLedgerRepository implements OrganizationLedgerRepository {
  public accountCapabilities: readonly AccountCapability[] | null = ["buyer"];
  public membership: OrganizationMember | null = OrganizationMember.rehydrate({
    userId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
    role: "finance",
    joinedAt: new Date("2026-03-09T10:00:00.000Z")
  });
  public appendedTransaction: LedgerTransaction | null = null;
  public walletSummary = OrganizationWalletSummary.create({
    organizationId: "9248f76b-218f-4974-a64f-401261d53005",
    usageBalanceCents: 2500,
    spendCreditsCents: 0,
    pendingEarningsCents: 0,
    withdrawableCashCents: 0
  });

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.accountCapabilities);
  }

  public findOrganizationMember(): Promise<OrganizationMember | null> {
    return Promise.resolve(this.membership);
  }

  public appendLedgerTransaction(
    transaction: LedgerTransaction
  ): Promise<void> {
    this.appendedTransaction = transaction;
    return Promise.resolve();
  }

  public getOrganizationWalletSummary(): Promise<OrganizationWalletSummary> {
    return Promise.resolve(this.walletSummary);
  }

  public getStagedPayoutExport(): Promise<StagedPayoutExport> {
    return Promise.reject(new Error("unused payout export path"));
  }
}

class InMemoryAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

describe("RecordCustomerChargeUseCase", () => {
  it("records a balanced customer charge and returns the updated wallet summary", async () => {
    const repository = new InMemoryLedgerRepository();
    const auditLog = new InMemoryAuditLog();
    const useCase = new RecordCustomerChargeUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-09T12:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "9248f76b-218f-4974-a64f-401261d53005",
      actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
      amountUsd: "25.00",
      paymentReference: "stripe_pi_123"
    });

    expect(repository.appendedTransaction?.toSnapshot()).toMatchObject({
      transactionType: "customer_charge",
      reference: "stripe_pi_123",
      postings: [
        {
          accountCode: "platform_cash_clearing",
          direction: "debit",
          amountUsd: "25.00"
        },
        {
          accountCode: "customer_prepaid_cash_liability",
          direction: "credit",
          amountUsd: "25.00",
          organizationId: "9248f76b-218f-4974-a64f-401261d53005"
        }
      ]
    });
    expect(response.walletSummary).toEqual({
      organizationId: "9248f76b-218f-4974-a64f-401261d53005",
      usageBalanceUsd: "25.00",
      spendCreditsUsd: "0.00",
      pendingEarningsUsd: "0.00",
      withdrawableCashUsd: "0.00"
    });
    expect(auditLog.events).toEqual([
      expect.objectContaining({
        eventName: "finance.customer_charge.recorded",
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0"
      })
    ]);
  });

  it("rejects missing organizations", async () => {
    const repository = new InMemoryLedgerRepository();
    repository.accountCapabilities = null;
    const useCase = new RecordCustomerChargeUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      })
    ).rejects.toThrowError(LedgerOrganizationNotFoundError);
  });

  it("rejects non-buyer organizations", async () => {
    const repository = new InMemoryLedgerRepository();
    repository.accountCapabilities = ["provider"];
    const useCase = new RecordCustomerChargeUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      })
    ).rejects.toThrowError(BuyerCapabilityRequiredError);
  });

  it("rejects members without finance authorization", async () => {
    const repository = new InMemoryLedgerRepository();
    repository.membership = OrganizationMember.rehydrate({
      userId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
      role: "developer",
      joinedAt: new Date("2026-03-09T10:00:00.000Z")
    });
    const useCase = new RecordCustomerChargeUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        amountUsd: "25.00",
        paymentReference: "stripe_pi_123"
      })
    ).rejects.toThrowError(OrganizationFinanceAuthorizationError);
  });
});
