import { describe, expect, it } from "vitest";
import { DomainValidationError } from "../../../src/domain/identity/DomainValidationError.js";
import { parseLedgerAccountCode } from "../../../src/domain/ledger/LedgerAccountCode.js";
import { LedgerPosting } from "../../../src/domain/ledger/LedgerPosting.js";
import { LedgerTransaction } from "../../../src/domain/ledger/LedgerTransaction.js";
import { OrganizationWalletSummary } from "../../../src/domain/ledger/OrganizationWalletSummary.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";

describe("LedgerTransaction", () => {
  it("records a balanced transaction snapshot", () => {
    const transaction = LedgerTransaction.record({
      organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a",
      transactionType: "customer_charge",
      reference: "stripe_pi_123",
      createdByUserId: "dc8c6463-f964-44b5-b737-56e5f6d06c63",
      occurredAt: new Date("2026-03-09T12:00:00.000Z"),
      postings: [
        LedgerPosting.create({
          accountCode: "platform_cash_clearing",
          direction: "debit",
          amount: UsdAmount.parse("25.00")
        }),
        LedgerPosting.create({
          accountCode: "customer_prepaid_cash_liability",
          direction: "credit",
          amount: UsdAmount.parse("25.00"),
          organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a"
        })
      ]
    });

    expect(transaction.toSnapshot()).toMatchObject({
      organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a",
      transactionType: "customer_charge",
      reference: "stripe_pi_123",
      createdByUserId: "dc8c6463-f964-44b5-b737-56e5f6d06c63",
      postings: [
        {
          accountCode: "platform_cash_clearing",
          direction: "debit",
          amountUsd: "25.00",
          organizationId: null
        },
        {
          accountCode: "customer_prepaid_cash_liability",
          direction: "credit",
          amountUsd: "25.00",
          organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a"
        }
      ]
    });
  });

  it("rejects unbalanced transactions", () => {
    expect(() =>
      LedgerTransaction.record({
        organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a",
        transactionType: "customer_charge",
        reference: "stripe_pi_123",
        createdByUserId: "dc8c6463-f964-44b5-b737-56e5f6d06c63",
        occurredAt: new Date("2026-03-09T12:00:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "platform_cash_clearing",
            direction: "debit",
            amount: UsdAmount.parse("25.00")
          }),
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "credit",
            amount: UsdAmount.parse("24.99"),
            organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a"
          })
        ]
      })
    ).toThrowError(DomainValidationError);
  });

  it("rejects zero-value postings", () => {
    expect(() =>
      LedgerPosting.create({
        accountCode: "platform_cash_clearing",
        direction: "debit",
        amount: UsdAmount.zero()
      })
    ).toThrowError(DomainValidationError);
  });

  it("parses and formats usd amounts with exact cents", () => {
    expect(UsdAmount.parse("12.5").toUsdString()).toBe("12.50");
    expect(
      UsdAmount.parse("12").add(UsdAmount.parse("0.50")).toUsdString()
    ).toBe("12.50");
  });

  it("rejects invalid usd amounts and unsupported account codes", () => {
    expect(() => UsdAmount.parse("12.345")).toThrowError(DomainValidationError);
    expect(() => UsdAmount.createFromCents(-1)).toThrowError(
      DomainValidationError
    );
    expect(() =>
      UsdAmount.parse("1.00").subtract(UsdAmount.parse("2.00"))
    ).toThrowError(DomainValidationError);
    expect(() => parseLedgerAccountCode("not_a_real_account")).toThrowError(
      DomainValidationError
    );
  });

  it("rejects invalid transaction references and too few postings", () => {
    expect(() =>
      LedgerTransaction.record({
        organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a",
        transactionType: "customer_charge",
        reference: "x",
        createdByUserId: "dc8c6463-f964-44b5-b737-56e5f6d06c63",
        occurredAt: new Date("2026-03-09T12:00:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "platform_cash_clearing",
            direction: "debit",
            amount: UsdAmount.parse("25.00")
          })
        ]
      })
    ).toThrowError(DomainValidationError);
  });

  it("builds wallet summaries with explicit default zero balances", () => {
    expect(
      OrganizationWalletSummary.create({
        organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a"
      }).toSnapshot()
    ).toEqual({
      organizationId: "63eabf51-6130-41d8-86ef-08286b97ae0a",
      usageBalanceUsd: "0.00",
      spendCreditsUsd: "0.00",
      pendingEarningsUsd: "0.00",
      withdrawableCashUsd: "0.00"
    });
  });
});
