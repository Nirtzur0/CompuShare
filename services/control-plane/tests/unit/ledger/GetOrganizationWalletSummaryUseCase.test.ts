import { describe, expect, it } from "vitest";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";
import type { StagedPayoutExport } from "../../../src/domain/ledger/StagedPayoutExport.js";
import {
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError
} from "../../../src/application/ledger/LedgerErrors.js";
import { GetOrganizationWalletSummaryUseCase } from "../../../src/application/ledger/GetOrganizationWalletSummaryUseCase.js";
import type { OrganizationLedgerRepository } from "../../../src/application/ledger/ports/OrganizationLedgerRepository.js";

class InMemoryWalletRepository implements OrganizationLedgerRepository {
  public accountCapabilities: readonly AccountCapability[] | null = [
    "buyer",
    "provider"
  ];
  public membership: OrganizationMember | null = OrganizationMember.rehydrate({
    userId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673",
    role: "finance",
    joinedAt: new Date("2026-03-09T10:00:00.000Z")
  });
  public walletSummary = OrganizationWalletSummary.create({
    organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
    usageBalanceCents: 1250,
    spendCreditsCents: 300,
    pendingEarningsCents: 850,
    withdrawableCashCents: 550
  });

  public findOrganizationAccountCapabilities(): Promise<
    readonly AccountCapability[] | null
  > {
    return Promise.resolve(this.accountCapabilities);
  }

  public findOrganizationMember(): Promise<OrganizationMember | null> {
    return Promise.resolve(this.membership);
  }

  public appendLedgerTransaction(): Promise<void> {
    return Promise.reject(new Error("unused transaction append path"));
  }

  public getOrganizationWalletSummary(): Promise<OrganizationWalletSummary> {
    return Promise.resolve(this.walletSummary);
  }

  public getStagedPayoutExport(): Promise<StagedPayoutExport> {
    return Promise.reject(new Error("unused payout export path"));
  }
}

describe("GetOrganizationWalletSummaryUseCase", () => {
  it("returns explicit wallet summary balances for finance members", async () => {
    const useCase = new GetOrganizationWalletSummaryUseCase(
      new InMemoryWalletRepository()
    );

    await expect(
      useCase.execute({
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        actorUserId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673"
      })
    ).resolves.toEqual({
      walletSummary: {
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        usageBalanceUsd: "12.50",
        spendCreditsUsd: "3.00",
        pendingEarningsUsd: "8.50",
        withdrawableCashUsd: "5.50"
      }
    });
  });

  it("rejects missing organizations", async () => {
    const repository = new InMemoryWalletRepository();
    repository.accountCapabilities = null;
    const useCase = new GetOrganizationWalletSummaryUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        actorUserId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673"
      })
    ).rejects.toThrowError(LedgerOrganizationNotFoundError);
  });

  it("rejects non-finance members", async () => {
    const repository = new InMemoryWalletRepository();
    repository.membership = OrganizationMember.rehydrate({
      userId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673",
      role: "developer",
      joinedAt: new Date("2026-03-09T10:00:00.000Z")
    });
    const useCase = new GetOrganizationWalletSummaryUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        actorUserId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673"
      })
    ).rejects.toThrowError(OrganizationFinanceAuthorizationError);
  });
});
