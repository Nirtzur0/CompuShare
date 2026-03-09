import { describe, expect, it } from "vitest";
import type { AccountCapability } from "../../../src/domain/identity/AccountCapability.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { StagedPayoutExport } from "../../../src/domain/ledger/StagedPayoutExport.js";
import { StagedPayoutExportEntry } from "../../../src/domain/ledger/StagedPayoutExportEntry.js";
import {
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError
} from "../../../src/application/ledger/LedgerErrors.js";
import { GetStagedPayoutExportUseCase } from "../../../src/application/ledger/GetStagedPayoutExportUseCase.js";
import type { OrganizationLedgerRepository } from "../../../src/application/ledger/ports/OrganizationLedgerRepository.js";
import type { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";

class InMemoryPayoutExportRepository implements OrganizationLedgerRepository {
  public accountCapabilities: readonly AccountCapability[] | null = [
    "buyer",
    "provider"
  ];
  public membership: OrganizationMember | null = OrganizationMember.rehydrate({
    userId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673",
    role: "finance",
    joinedAt: new Date("2026-03-09T10:00:00.000Z")
  });
  public payoutExport = StagedPayoutExport.create({
    organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
    entries: [
      StagedPayoutExportEntry.create({
        providerOrganizationId: "7ce4c10d-e012-4e63-bdd1-31ca17750329",
        settlementReference: "job_0001",
        providerPayableCents: 850,
        reserveHoldbackCents: 30
      })
    ]
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
    return Promise.reject(new Error("unused wallet summary path"));
  }

  public getStagedPayoutExport(): Promise<StagedPayoutExport> {
    return Promise.resolve(this.payoutExport);
  }
}

describe("GetStagedPayoutExportUseCase", () => {
  it("returns the staged payout export for finance members", async () => {
    const useCase = new GetStagedPayoutExportUseCase(
      new InMemoryPayoutExportRepository()
    );

    await expect(
      useCase.execute({
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        actorUserId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673"
      })
    ).resolves.toEqual({
      payoutExport: {
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        entries: [
          {
            providerOrganizationId: "7ce4c10d-e012-4e63-bdd1-31ca17750329",
            settlementReference: "job_0001",
            providerPayableUsd: "8.50",
            reserveHoldbackUsd: "0.30",
            withdrawableCashUsd: "8.20"
          }
        ]
      }
    });
  });

  it("rejects missing organizations", async () => {
    const repository = new InMemoryPayoutExportRepository();
    repository.accountCapabilities = null;
    const useCase = new GetStagedPayoutExportUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        actorUserId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673"
      })
    ).rejects.toThrowError(LedgerOrganizationNotFoundError);
  });

  it("rejects non-finance members", async () => {
    const repository = new InMemoryPayoutExportRepository();
    repository.membership = OrganizationMember.rehydrate({
      userId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673",
      role: "developer",
      joinedAt: new Date("2026-03-09T10:00:00.000Z")
    });
    const useCase = new GetStagedPayoutExportUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "c470d5d4-f575-4d92-8113-6e52fd8d4f2d",
        actorUserId: "03dff188-cd14-4d67-bf13-9ba3d5d5c673"
      })
    ).rejects.toThrowError(OrganizationFinanceAuthorizationError);
  });
});
