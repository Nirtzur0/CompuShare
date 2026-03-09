import type { AccountCapability } from "../../../domain/identity/AccountCapability.js";
import type { OrganizationId } from "../../../domain/identity/OrganizationId.js";
import type { ProviderBenchmarkReport } from "../../../domain/provider/ProviderBenchmarkReport.js";
import type { ProviderNodeId } from "../../../domain/provider/ProviderNodeId.js";

export interface ProviderBenchmarkRepository {
  findOrganizationAccountCapabilities(
    organizationId: OrganizationId
  ): Promise<readonly AccountCapability[] | null>;
  providerNodeExists(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<boolean>;
  listProviderBenchmarkReports(
    organizationId: OrganizationId,
    providerNodeId: ProviderNodeId
  ): Promise<readonly ProviderBenchmarkReport[]>;
  createProviderBenchmarkReport(
    benchmarkReport: ProviderBenchmarkReport
  ): Promise<void>;
}
