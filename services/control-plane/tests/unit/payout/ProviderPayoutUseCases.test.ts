import { describe, expect, it } from "vitest";
import type {
  AuditEvent,
  AuditLog
} from "../../../src/application/identity/ports/AuditLog.js";
import type { ProviderPayoutRepository } from "../../../src/application/payout/ports/ProviderPayoutRepository.js";
import type {
  StripeConnectClient,
  StripeConnectWebhookEvent
} from "../../../src/application/payout/ports/StripeConnectClient.js";
import type { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import type { UserId } from "../../../src/domain/identity/UserId.js";
import { ProviderPayoutDisbursement } from "../../../src/domain/payout/ProviderPayoutDisbursement.js";
import type { ProviderPayoutRun } from "../../../src/domain/payout/ProviderPayoutRun.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";
import { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";
import { OrganizationMember } from "../../../src/domain/identity/OrganizationMember.js";
import { GetProviderPayoutAvailabilityUseCase } from "../../../src/application/payout/GetProviderPayoutAvailabilityUseCase.js";
import { GetProviderPayoutAccountStatusUseCase } from "../../../src/application/payout/GetProviderPayoutAccountStatusUseCase.js";
import { IssueProviderPayoutOnboardingLinkUseCase } from "../../../src/application/payout/IssueProviderPayoutOnboardingLinkUseCase.js";
import { ProcessStripeConnectWebhookUseCase } from "../../../src/application/payout/ProcessStripeConnectWebhookUseCase.js";
import { RunProviderPayoutRunUseCase } from "../../../src/application/payout/RunProviderPayoutRunUseCase.js";
import { ProviderPayoutAccount } from "../../../src/domain/payout/ProviderPayoutAccount.js";
import {
  LedgerOrganizationNotFoundError,
  OrganizationFinanceAuthorizationError,
  ProviderCapabilityRequiredError
} from "../../../src/application/ledger/LedgerErrors.js";

class InMemoryProviderPayoutRepository implements ProviderPayoutRepository {
  public readonly capabilities = new Map<
    string,
    readonly ("buyer" | "provider")[]
  >();
  public readonly members = new Map<string, OrganizationMember>();
  public readonly walletSummaries = new Map<
    string,
    OrganizationWalletSummary
  >();
  public readonly payoutAccounts = new Map<string, ProviderPayoutAccount>();
  public readonly payoutAccountsByStripeId = new Map<
    string,
    ProviderPayoutAccount
  >();
  public readonly payoutRuns = new Map<string, ProviderPayoutRun>();
  public readonly disbursements = new Map<string, ProviderPayoutDisbursement>();
  public readonly webhookReceipts = new Set<string>();
  public readonly activeDisputeHolds = new Map<string, number>();

  public async findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly ("buyer" | "provider")[] | null> {
    return await Promise.resolve(
      this.capabilities.get(organizationId.value) ?? null
    );
  }

  public async findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null> {
    return await Promise.resolve(
      this.members.get(`${organizationId.value}:${userId.value}`) ?? null
    );
  }

  public async getOrganizationWalletSummary(
    organizationId: OrganizationId
  ): Promise<OrganizationWalletSummary> {
    return await Promise.resolve(
      this.walletSummaries.get(organizationId.value) ??
        OrganizationWalletSummary.create({
          organizationId: organizationId.value
        })
    );
  }

  public async listProviderOrganizationIds(input: {
    providerOrganizationId?: OrganizationId;
  }): Promise<readonly string[]> {
    return await Promise.resolve(
      input.providerOrganizationId === undefined
        ? [...this.capabilities.entries()]
            .filter(([, capabilities]) => capabilities.includes("provider"))
            .map(([organizationId]) => organizationId)
            .sort()
        : [input.providerOrganizationId.value]
    );
  }

  public async findProviderPayoutAccountByOrganizationId(
    organizationId: OrganizationId
  ): Promise<ProviderPayoutAccount | null> {
    return await Promise.resolve(
      this.payoutAccounts.get(organizationId.value) ?? null
    );
  }

  public async findProviderPayoutAccountByStripeAccountId(
    stripeAccountId: string
  ): Promise<ProviderPayoutAccount | null> {
    return await Promise.resolve(
      this.payoutAccountsByStripeId.get(stripeAccountId) ?? null
    );
  }

  public async upsertProviderPayoutAccount(
    account: ProviderPayoutAccount
  ): Promise<void> {
    this.payoutAccounts.set(account.organizationId.value, account);
    this.payoutAccountsByStripeId.set(account.stripeAccountId, account);
    await Promise.resolve();
  }

  public async getProviderPayoutAvailability(organizationId: OrganizationId) {
    const wallet = await this.getOrganizationWalletSummary(organizationId);
    const relevant = [...this.disbursements.values()]
      .filter(
        (item) =>
          item.providerOrganizationId.value === organizationId.value &&
          (item.status === "pending" || item.status === "paid")
      )
      .sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()
      );
    const reserved = relevant.reduce((sum, item) => sum + item.amount.cents, 0);
    const activeDisputeHold =
      this.activeDisputeHolds.get(organizationId.value) ?? 0;

    return (
      await import("../../../src/domain/payout/ProviderPayoutAvailability.js")
    ).ProviderPayoutAvailability.create({
      organizationId: organizationId.value,
      pendingEarningsCents: wallet.pendingEarnings.cents,
      reserveHoldbackCents: Math.max(
        wallet.pendingEarnings.cents - wallet.withdrawableCash.cents,
        0
      ),
      withdrawableCashCents: wallet.withdrawableCash.cents,
      activeDisputeHoldCents: activeDisputeHold,
      eligiblePayoutCents: Math.max(
        wallet.withdrawableCash.cents - reserved - activeDisputeHold,
        0
      ),
      lastPayoutAt: relevant[0]?.updatedAt ?? null,
      lastPayoutStatus: relevant[0]?.status ?? "none"
    });
  }

  public async getActiveProviderDisputeHold(
    providerOrganizationId: OrganizationId
  ): Promise<UsdAmount> {
    return await Promise.resolve(
      UsdAmount.createFromCents(
        this.activeDisputeHolds.get(providerOrganizationId.value) ?? 0
      )
    );
  }

  public async createProviderPayoutRun(run: ProviderPayoutRun): Promise<void> {
    this.payoutRuns.set(run.id, run);
    await Promise.resolve();
  }

  public async updateProviderPayoutRun(run: ProviderPayoutRun): Promise<void> {
    this.payoutRuns.set(run.id, run);
    await Promise.resolve();
  }

  public async createProviderPayoutDisbursement(
    disbursement: ProviderPayoutDisbursement
  ): Promise<void> {
    this.disbursements.set(disbursement.id, disbursement);
    await Promise.resolve();
  }

  public async updateProviderPayoutDisbursement(
    disbursement: ProviderPayoutDisbursement
  ): Promise<void> {
    this.disbursements.set(disbursement.id, disbursement);
    await Promise.resolve();
  }

  public async findProviderPayoutDisbursementByStripePayoutId(
    stripePayoutId: string
  ): Promise<ProviderPayoutDisbursement | null> {
    return await Promise.resolve(
      [...this.disbursements.values()].find(
        (item) => item.stripePayoutId === stripePayoutId
      ) ?? null
    );
  }

  public async recordStripeWebhookReceipt(input: {
    eventId: string;
  }): Promise<boolean> {
    if (this.webhookReceipts.has(input.eventId)) {
      return await Promise.resolve(false);
    }

    this.webhookReceipts.add(input.eventId);
    return await Promise.resolve(true);
  }
}

class InMemoryAuditLog implements AuditLog {
  public readonly events: AuditEvent[] = [];

  public async record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    await Promise.resolve();
  }
}

class InMemoryStripeConnectClient implements StripeConnectClient {
  public webhookEvent: StripeConnectWebhookEvent = {
    id: "evt_1",
    type: "unsupported"
  };
  public throwOnCreateTransfer: Error | null = null;
  public throwOnCreatePayout: Error | null = null;

  public async createExpressAccount() {
    return await Promise.resolve({
      accountId: "acct_test_123",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      country: "US",
      defaultCurrency: "usd",
      requirementsCurrentlyDue: ["external_account"],
      requirementsEventuallyDue: []
    });
  }

  public async createOnboardingLink() {
    return await Promise.resolve({
      accountId: "acct_test_123",
      onboardingUrl: "https://connect.stripe.test/onboarding/acct_test_123",
      expiresAt: "2026-03-10T12:00:00.000Z"
    });
  }

  public async retrieveAccount(accountId: string) {
    return await Promise.resolve({
      accountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      country: "US",
      defaultCurrency: "usd",
      requirementsCurrentlyDue: [],
      requirementsEventuallyDue: []
    });
  }

  public async createTransfer() {
    if (this.throwOnCreateTransfer !== null) {
      throw this.throwOnCreateTransfer;
    }
    return await Promise.resolve({ transferId: "tr_123" });
  }

  public async createPayout() {
    if (this.throwOnCreatePayout !== null) {
      throw this.throwOnCreatePayout;
    }
    return await Promise.resolve({ payoutId: "po_123" });
  }

  public verifyWebhook(): StripeConnectWebhookEvent {
    return this.webhookEvent;
  }
}

describe("provider payout use cases", () => {
  it("issues a new onboarding link for a provider finance member", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const auditLog = new InMemoryAuditLog();
    const stripe = new InMemoryStripeConnectClient();
    const organizationId = "00000000-0000-0000-0000-000000000001";
    const actorUserId = "00000000-0000-0000-0000-000000000001";
    repository.capabilities.set(organizationId, ["provider"]);
    repository.members.set(
      `${organizationId}:${actorUserId}`,
      OrganizationMember.rehydrate({
        userId: actorUserId,
        role: "finance",
        joinedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new IssueProviderPayoutOnboardingLinkUseCase(
      repository,
      stripe,
      auditLog,
      "http://127.0.0.1:3100",
      "http://127.0.0.1:3100",
      () => new Date("2026-03-10T10:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId,
      actorUserId
    });

    expect(response.accountId).toBe("acct_test_123");
    expect(auditLog.events.map((event) => event.eventName)).toEqual([
      "finance.provider_payout_account.created",
      "finance.provider_payout_account.onboarding_link_issued"
    ]);
  });

  it("returns payout availability net of reserved disbursements", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    repository.capabilities.set("87057cb0-e0ca-4095-9f25-dd8103408b18", [
      "provider"
    ]);
    repository.members.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18:97d876d5-6fbe-4176-b88a-c6ddd400af45",
      OrganizationMember.rehydrate({
        userId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        role: "finance",
        joinedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    repository.walletSummaries.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18",
      OrganizationWalletSummary.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        pendingEarningsCents: 5000,
        withdrawableCashCents: 4000
      })
    );
    await repository.createProviderPayoutDisbursement(
      ProviderPayoutDisbursement.createPending({
        payoutRunId: "run-1",
        providerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        stripeAccountId: "acct_1",
        idempotencyKey: "run-1:1",
        amountCents: 1500,
        currency: "usd",
        createdAt: new Date("2026-03-10T10:00:00.000Z")
      })
    );
    const useCase = new GetProviderPayoutAvailabilityUseCase(repository);

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.payoutAvailability).toMatchObject({
      withdrawableCashUsd: "40.00",
      activeDisputeHoldUsd: "0.00",
      eligiblePayoutUsd: "25.00",
      reserveHoldbackUsd: "10.00",
      lastPayoutStatus: "pending"
    });
  });

  it("rejects payout availability when the organization does not exist", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const useCase = new GetProviderPayoutAvailabilityUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      })
    ).rejects.toThrow(LedgerOrganizationNotFoundError);
  });

  it("rejects payout availability when the organization lacks provider capability", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    repository.capabilities.set("87057cb0-e0ca-4095-9f25-dd8103408b18", [
      "buyer"
    ]);
    repository.members.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18:97d876d5-6fbe-4176-b88a-c6ddd400af45",
      OrganizationMember.rehydrate({
        userId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        role: "finance",
        joinedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new GetProviderPayoutAvailabilityUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      })
    ).rejects.toThrow(ProviderCapabilityRequiredError);
  });

  it("rejects payout availability when the actor lacks finance permissions", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    repository.capabilities.set("87057cb0-e0ca-4095-9f25-dd8103408b18", [
      "provider"
    ]);
    repository.members.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18:97d876d5-6fbe-4176-b88a-c6ddd400af45",
      OrganizationMember.rehydrate({
        userId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        role: "developer",
        joinedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new GetProviderPayoutAvailabilityUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      })
    ).rejects.toThrow(OrganizationFinanceAuthorizationError);
  });

  it("syncs account status from Stripe", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("87057cb0-e0ca-4095-9f25-dd8103408b18", [
      "provider"
    ]);
    repository.members.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18:97d876d5-6fbe-4176-b88a-c6ddd400af45",
      OrganizationMember.rehydrate({
        userId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        role: "finance",
        joinedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        stripeAccountId: "acct_live",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: ["external_account"],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new GetProviderPayoutAccountStatusUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
    });

    expect(response.payoutAccount).toMatchObject({
      accountId: "acct_live",
      onboardingStatus: "completed",
      payoutsEnabled: true
    });
  });

  it("rejects payout account status lookups when no Stripe account exists yet", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("87057cb0-e0ca-4095-9f25-dd8103408b18", [
      "provider"
    ]);
    repository.members.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18:97d876d5-6fbe-4176-b88a-c6ddd400af45",
      OrganizationMember.rehydrate({
        userId: "97d876d5-6fbe-4176-b88a-c6ddd400af45",
        role: "finance",
        joinedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new GetProviderPayoutAccountStatusUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    await expect(
      useCase.execute({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        actorUserId: "97d876d5-6fbe-4176-b88a-c6ddd400af45"
      })
    ).rejects.toThrow("Provider payout account for organization");
  });

  it("runs a dry-run payout pass without submitting Stripe payouts", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("87057cb0-e0ca-4095-9f25-dd8103408b18", [
      "provider"
    ]);
    repository.walletSummaries.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18",
      OrganizationWalletSummary.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        pendingEarningsCents: 5000,
        withdrawableCashCents: 5000
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        stripeAccountId: "acct_live",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new RunProviderPayoutRunUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      environment: "development",
      dryRun: true
    });

    expect(response.payoutRun).toMatchObject({
      status: "completed",
      submittedDisbursements: 0,
      skippedOrganizations: 1
    });
  });

  it("reconciles a payout.paid webhook idempotently", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    const disbursement = ProviderPayoutDisbursement.createPending({
      payoutRunId: "run_1",
      providerOrganizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
      stripeAccountId: "acct_live",
      idempotencyKey: "run_1:key",
      amountCents: 500,
      currency: "usd",
      createdAt: new Date("2026-03-10T10:00:00.000Z")
    }).withStripeSubmission({
      stripeTransferId: "tr_1",
      stripePayoutId: "po_123",
      updatedAt: new Date("2026-03-10T10:00:00.000Z")
    });
    await repository.createProviderPayoutDisbursement(disbursement);
    stripe.webhookEvent = {
      id: "evt_paid_1",
      type: "payout.paid",
      payoutId: "po_123",
      accountId: "acct_live",
      failureCode: null,
      failureMessage: null
    };
    const useCase = new ProcessStripeConnectWebhookUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    await useCase.execute({ payload: "{}", signature: "sig" });
    await useCase.execute({ payload: "{}", signature: "sig" });

    expect(
      (
        await repository.findProviderPayoutDisbursementByStripePayoutId(
          "po_123"
        )
      )?.status
    ).toBe("paid");
    expect(repository.webhookReceipts.size).toBe(1);
  });

  it("syncs an account.updated webhook into the payout account state", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        stripeAccountId: "acct_live",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: ["external_account"],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    stripe.webhookEvent = {
      id: "evt_account_1",
      type: "account.updated",
      account: {
        accountId: "acct_live",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: []
      }
    };
    const useCase = new ProcessStripeConnectWebhookUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    await useCase.execute({ payload: "{}", signature: "sig" });

    expect(
      (await repository.findProviderPayoutAccountByStripeAccountId("acct_live"))
        ?.payoutsEnabled
    ).toBe(true);
  });

  it("ignores unsupported webhooks after dedupe recording", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    stripe.webhookEvent = {
      id: "evt_unsupported_1",
      type: "unsupported"
    };
    const useCase = new ProcessStripeConnectWebhookUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    await expect(
      useCase.execute({ payload: "{}", signature: "sig" })
    ).resolves.toEqual({ accepted: true });
    expect(repository.webhookReceipts.has("evt_unsupported_1")).toBe(true);
  });

  it("submits a real payout when the provider is eligible", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("87057cb0-e0ca-4095-9f25-dd8103408b18", [
      "provider"
    ]);
    repository.walletSummaries.set(
      "87057cb0-e0ca-4095-9f25-dd8103408b18",
      OrganizationWalletSummary.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        pendingEarningsCents: 5000,
        withdrawableCashCents: 5000
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "87057cb0-e0ca-4095-9f25-dd8103408b18",
        stripeAccountId: "acct_live",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new RunProviderPayoutRunUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      environment: "development",
      dryRun: false
    });

    expect(response.payoutRun).toMatchObject({
      submittedDisbursements: 1,
      skippedOrganizations: 0
    });
    expect([...repository.disbursements.values()][0]?.stripePayoutId).toBe(
      "po_123"
    );
  });

  it("skips providers without payout accounts or enabled payouts", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("00000000-0000-0000-0000-000000000010", [
      "provider"
    ]);
    repository.capabilities.set("00000000-0000-0000-0000-000000000011", [
      "provider"
    ]);
    repository.walletSummaries.set(
      "00000000-0000-0000-0000-000000000011",
      OrganizationWalletSummary.create({
        organizationId: "00000000-0000-0000-0000-000000000011",
        pendingEarningsCents: 5000,
        withdrawableCashCents: 5000
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "00000000-0000-0000-0000-000000000011",
        stripeAccountId: "acct_disabled",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new RunProviderPayoutRunUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      environment: "development",
      dryRun: false
    });

    expect(response.payoutRun.skippedOrganizations).toBe(2);
    expect(response.payoutRun.disbursements.map((item) => item.reason)).toEqual(
      ["missing_payout_account", "payouts_not_enabled"]
    );
  });

  it("skips providers below the minimum payout threshold", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("00000000-0000-0000-0000-000000000012", [
      "provider"
    ]);
    repository.walletSummaries.set(
      "00000000-0000-0000-0000-000000000012",
      OrganizationWalletSummary.create({
        organizationId: "00000000-0000-0000-0000-000000000012",
        pendingEarningsCents: 99,
        withdrawableCashCents: 99
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "00000000-0000-0000-0000-000000000012",
        stripeAccountId: "acct_small",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new RunProviderPayoutRunUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      environment: "development",
      dryRun: false
    });

    expect(response.payoutRun.disbursements).toEqual([
      expect.objectContaining({
        providerOrganizationId: "00000000-0000-0000-0000-000000000012",
        status: "skipped",
        reason: "below_minimum_payout"
      })
    ]);
  });

  it("limits a payout run to the requested provider organization id", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("00000000-0000-0000-0000-000000000013", [
      "provider"
    ]);
    repository.capabilities.set("00000000-0000-0000-0000-000000000014", [
      "provider"
    ]);
    repository.walletSummaries.set(
      "00000000-0000-0000-0000-000000000013",
      OrganizationWalletSummary.create({
        organizationId: "00000000-0000-0000-0000-000000000013",
        pendingEarningsCents: 5000,
        withdrawableCashCents: 5000
      })
    );
    repository.walletSummaries.set(
      "00000000-0000-0000-0000-000000000014",
      OrganizationWalletSummary.create({
        organizationId: "00000000-0000-0000-0000-000000000014",
        pendingEarningsCents: 5000,
        withdrawableCashCents: 5000
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "00000000-0000-0000-0000-000000000013",
        stripeAccountId: "acct_filter",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "00000000-0000-0000-0000-000000000014",
        stripeAccountId: "acct_other",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new RunProviderPayoutRunUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    const response = await useCase.execute({
      environment: "development",
      dryRun: false,
      providerOrganizationId: "00000000-0000-0000-0000-000000000013"
    });

    expect(response.payoutRun.attemptedOrganizations).toBe(1);
    expect(response.payoutRun.disbursements).toHaveLength(1);
    expect(response.payoutRun.disbursements[0]?.providerOrganizationId).toBe(
      "00000000-0000-0000-0000-000000000013"
    );
  });

  it("fails the payout run and records failure audit data when Stripe transfer creation fails", async () => {
    const repository = new InMemoryProviderPayoutRepository();
    const stripe = new InMemoryStripeConnectClient();
    stripe.throwOnCreateTransfer = new Error("transfer failed");
    const auditLog = new InMemoryAuditLog();
    repository.capabilities.set("00000000-0000-0000-0000-000000000015", [
      "provider"
    ]);
    repository.walletSummaries.set(
      "00000000-0000-0000-0000-000000000015",
      OrganizationWalletSummary.create({
        organizationId: "00000000-0000-0000-0000-000000000015",
        pendingEarningsCents: 5000,
        withdrawableCashCents: 5000
      })
    );
    await repository.upsertProviderPayoutAccount(
      ProviderPayoutAccount.create({
        organizationId: "00000000-0000-0000-0000-000000000015",
        stripeAccountId: "acct_fail",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        country: "US",
        defaultCurrency: "usd",
        requirementsCurrentlyDue: [],
        requirementsEventuallyDue: [],
        lastStripeSyncAt: new Date("2026-03-09T00:00:00.000Z"),
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        updatedAt: new Date("2026-03-09T00:00:00.000Z")
      })
    );
    const useCase = new RunProviderPayoutRunUseCase(
      repository,
      stripe,
      auditLog,
      () => new Date("2026-03-10T12:00:00.000Z")
    );

    await expect(
      useCase.execute({
        environment: "development",
        dryRun: false
      })
    ).rejects.toThrow("transfer failed");

    const [failedRun] = [...repository.payoutRuns.values()];
    const lastAuditEvent = auditLog.events.at(-1);
    expect(failedRun?.status).toBe("failed");
    expect(lastAuditEvent?.eventName).toBe("finance.payout_run.failed");
    expect(lastAuditEvent?.metadata).toMatchObject({
      errorMessage: "transfer failed"
    });
  });
});
