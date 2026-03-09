import { OrganizationId } from "../identity/OrganizationId.js";
import type {
  StagedPayoutExportEntry,
  StagedPayoutExportEntrySnapshot
} from "./StagedPayoutExportEntry.js";

export interface StagedPayoutExportSnapshot {
  organizationId: string;
  entries: StagedPayoutExportEntrySnapshot[];
}

export class StagedPayoutExport {
  private constructor(
    public readonly organizationId: OrganizationId,
    public readonly entries: readonly StagedPayoutExportEntry[]
  ) {}

  public static create(input: {
    organizationId: string;
    entries: readonly StagedPayoutExportEntry[];
  }): StagedPayoutExport {
    return new StagedPayoutExport(OrganizationId.create(input.organizationId), [
      ...input.entries
    ]);
  }

  public toSnapshot(): StagedPayoutExportSnapshot {
    return {
      organizationId: this.organizationId.value,
      entries: this.entries.map((entry) => entry.toSnapshot())
    };
  }
}
