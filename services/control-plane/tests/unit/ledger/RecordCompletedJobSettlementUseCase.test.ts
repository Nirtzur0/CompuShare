import { describe, expect, it } from "vitest";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import type { LedgerTransaction } from "../../../src/domain/ledger/LedgerTransaction.js";
import { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";
import type { StagedPayoutExport } from "../../../src/domain/ledger/StagedPayoutExport.js";
import {
  BuyerCapabilityRequiredError,
  LedgerInsufficientPrepaidBalanceError,
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError,
  ProviderCapabilityRequiredError
} from "../../../src/application/ledger/LedgerErrors.js";
import { RecordCompletedJobSettlementUseCase } from "../../../src/application/ledger/RecordCompletedJobSettlementUseCase.js";
import type { OrganizationLedgerRepository } from "../../../src/application/ledger/ports/OrganizationLedgerRepository.js";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";

class InMemoryLedgerRepository implements OrganizationLedgerRepository {
  public readonly capabilitiesByOrganization = new Map<
    string,
    readonly AccountCapability[]
  >([
    ["9248f76b-218f-4974-a64f-401261d53005", ["buyer"]],
    ["d31d3753-0196-4d31-9be3-1577a0f084e4", ["provider"]]
  ]);
  public membership: OrganizationMember | null = OrganizationMember.rehydrate({
    userId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
    role: "finance",
    joinedAt: new Date("2026-03-09T10:00:00.000Z")
  });
  public appendedTransaction: LedgerTransaction | null = null;
  private readonly buyerWalletSummaries = [
    OrganizationWalletSummary.create({
      organizationId: "9248f76b-218f-4974-a64f-401261d53005",
      usageBalanceCents: 2500,
      spendCreditsCents: 0,
      pendingEarningsCents: 0,
      withdrawableCashCents: 0
    }),
    OrganizationWalletSummary.create({
      organizationId: "9248f76b-218f-4974-a64f-401261d53005",
      usageBalanceCents: 1500,
      spendCreditsCents: 0,
      pendingEarningsCents: 0,
      withdrawableCashCents: 0
    })
  ];

  public findOrganizationAccountCapabilities(organizationId: {
    value: string;
  }): Promise<readonly AccountCapability[] | null> {
    return Promise.resolve(
      this.capabilitiesByOrganization.get(organizationId.value) ?? null
    );
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

  public getOrganizationWalletSummary(organizationId: {
    value: string;
  }): Promise<OrganizationWalletSummary> {
    if (organizationId.value !== "9248f76b-218f-4974-a64f-401261d53005") {
      return Promise.resolve(
        OrganizationWalletSummary.create({
          organizationId: organizationId.value
        })
      );
    }

    const nextSummary =
      this.buyerWalletSummaries.shift() ??
      OrganizationWalletSummary.create({
        organizationId: organizationId.value,
        usageBalanceCents: 1500,
        spendCreditsCents: 0,
        pendingEarningsCents: 0,
        withdrawableCashCents: 0
      });

    return Promise.resolve(nextSummary);
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

describe("RecordCompletedJobSettlementUseCase", () => {
  it("records a balanced completed-job settlement and returns the buyer wallet summary", async () => {
    const repository = new InMemoryLedgerRepository();
    const auditLog = new InMemoryAuditLog();
    const useCase = new RecordCompletedJobSettlementUseCase(
      repository,
      auditLog,
      () => new Date("2026-03-09T13:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "9248f76b-218f-4974-a64f-401261d53005",
      actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
      providerOrganizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4",
      providerPayableUsd: "8.50",
      platformRevenueUsd: "1.20",
      reserveHoldbackUsd: "0.30",
      jobReference: "job_0001"
    });

    expect(repository.appendedTransaction?.toSnapshot()).toMatchObject({
      transactionType: "job_settlement",
      reference: "job_0001",
      postings: [
        {
          accountCode: "customer_prepaid_cash_liability",
          direction: "debit",
          amountUsd: "10.00",
          organizationId: "9248f76b-218f-4974-a64f-401261d53005"
        },
        {
          accountCode: "provider_payable",
          direction: "credit",
          amountUsd: "8.50",
          organizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4"
        },
        {
          accountCode: "platform_revenue",
          direction: "credit",
          amountUsd: "1.20",
          organizationId: null
        },
        {
          accountCode: "risk_reserve",
          direction: "credit",
          amountUsd: "0.30",
          organizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4"
        }
      ]
    });
    expect(response.walletSummary).toEqual({
      organizationId: "9248f76b-218f-4974-a64f-401261d53005",
      usageBalanceUsd: "15.00",
      spendCreditsUsd: "0.00",
      pendingEarningsUsd: "0.00",
      withdrawableCashUsd: "0.00"
    });
    expect(auditLog.events).toEqual([
      expect.objectContaining({
        eventName: "finance.job_settlement.recorded",
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0"
      })
    ]);
  });

  it("rejects missing buyer organizations", async () => {
    const repository = new InMemoryLedgerRepository();
    repository.capabilitiesByOrganization.delete(
      "9248f76b-218f-4974-a64f-401261d53005"
    );
    const useCase = new RecordCompletedJobSettlementUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        providerOrganizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      })
    ).rejects.toThrowError(LedgerOrganizationNotFoundError);
  });

  it("rejects non-buyer organizations", async () => {
    const repository = new InMemoryLedgerRepository();
    repository.capabilitiesByOrganization.set(
      "9248f76b-218f-4974-a64f-401261d53005",
      ["provider"]
    );
    const useCase = new RecordCompletedJobSettlementUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        providerOrganizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
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
    const useCase = new RecordCompletedJobSettlementUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        providerOrganizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      })
    ).rejects.toThrowError(OrganizationFinanceAuthorizationError);
  });

  it("rejects organizations without provider capability", async () => {
    const repository = new InMemoryLedgerRepository();
    repository.capabilitiesByOrganization.set(
      "d31d3753-0196-4d31-9be3-1577a0f084e4",
      ["buyer"]
    );
    const useCase = new RecordCompletedJobSettlementUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        providerOrganizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      })
    ).rejects.toThrowError(ProviderCapabilityRequiredError);
  });

  it("rejects missing provider organizations", async () => {
    const repository = new InMemoryLedgerRepository();
    repository.capabilitiesByOrganization.delete(
      "d31d3753-0196-4d31-9be3-1577a0f084e4"
    );
    const useCase = new RecordCompletedJobSettlementUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        providerOrganizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4",
        providerPayableUsd: "8.50",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      })
    ).rejects.toThrowError(LedgerOrganizationNotFoundError);
  });

  it("rejects settlements that exceed the buyer prepaid balance", async () => {
    const repository = new InMemoryLedgerRepository();
    const useCase = new RecordCompletedJobSettlementUseCase(
      repository,
      new InMemoryAuditLog()
    );

    await expect(
      useCase.execute({
        organizationId: "9248f76b-218f-4974-a64f-401261d53005",
        actorUserId: "3b8491c8-18aa-45af-8c35-f8a9a81f75f0",
        providerOrganizationId: "d31d3753-0196-4d31-9be3-1577a0f084e4",
        providerPayableUsd: "24.00",
        platformRevenueUsd: "1.20",
        reserveHoldbackUsd: "0.30",
        jobReference: "job_0001"
      })
    ).rejects.toThrowError(LedgerInsufficientPrepaidBalanceError);
  });
});
