import { DomainValidationError } from "../identity/DomainValidationError.js";
import { OrganizationId } from "../identity/OrganizationId.js";
import { UsdAmount } from "./UsdAmount.js";

export interface StagedPayoutExportEntrySnapshot {
  providerOrganizationId: string;
  settlementReference: string;
  providerPayableUsd: string;
  reserveHoldbackUsd: string;
  withdrawableCashUsd: string;
}

export class StagedPayoutExportEntry {
  private constructor(
    public readonly providerOrganizationId: OrganizationId,
    public readonly settlementReference: string,
    public readonly providerPayable: UsdAmount,
    public readonly reserveHoldback: UsdAmount,
    public readonly withdrawableCash: UsdAmount
  ) {}

  public static create(input: {
    providerOrganizationId: string;
    settlementReference: string;
    providerPayableCents: number;
    reserveHoldbackCents: number;
  }): StagedPayoutExportEntry {
    const settlementReference = input.settlementReference.trim();

    if (settlementReference.length < 3 || settlementReference.length > 120) {
      throw new DomainValidationError(
        "Settlement references must be between 3 and 120 characters."
      );
    }

    const providerPayable = UsdAmount.createFromCents(
      input.providerPayableCents
    );
    const reserveHoldback = UsdAmount.createFromCents(
      input.reserveHoldbackCents
    );

    return new StagedPayoutExportEntry(
      OrganizationId.create(input.providerOrganizationId),
      settlementReference,
      providerPayable,
      reserveHoldback,
      providerPayable.subtract(reserveHoldback)
    );
  }

  public toSnapshot(): StagedPayoutExportEntrySnapshot {
    return {
      providerOrganizationId: this.providerOrganizationId.value,
      settlementReference: this.settlementReference,
      providerPayableUsd: this.providerPayable.toUsdString(),
      reserveHoldbackUsd: this.reserveHoldback.toUsdString(),
      withdrawableCashUsd: this.withdrawableCash.toUsdString()
    };
  }
}
