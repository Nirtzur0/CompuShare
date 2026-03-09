import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { OrganizationMember } from "../../../domain/identity/OrganizationMember.js";
import type { UserId } from "../../../domain/identity/UserId.js";
import type { LedgerTransaction } from "../../../domain/ledger/LedgerTransaction.js";
import type { OrganizationWalletSummary } from "../../../domain/ledger/OrganizationWalletSummary.js";
import type { StagedPayoutExport } from "../../../domain/ledger/StagedPayoutExport.js";

export interface OrganizationLedgerRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  findOrganizationMember(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<OrganizationMember | null>;
  appendLedgerTransaction(transaction: LedgerTransaction): Promise<void>;
  getOrganizationWalletSummary(
    organizationId: OrganizationId
  ): Promise<OrganizationWalletSummary>;
  getStagedPayoutExport(
    organizationId: OrganizationId
  ): Promise<StagedPayoutExport>;
}
