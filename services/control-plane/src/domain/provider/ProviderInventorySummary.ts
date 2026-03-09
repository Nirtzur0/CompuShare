import type {
  ProviderBenchmarkReport,
  ProviderBenchmarkReportSnapshot
} from "./ProviderBenchmarkReport.js";
import type { ProviderNode, ProviderNodeSnapshot } from "./ProviderNode.js";

export interface ProviderInventorySummarySnapshot {
  node: ProviderNodeSnapshot;
  latestBenchmark: ProviderBenchmarkReportSnapshot | null;
}

export class ProviderInventorySummary {
  public constructor(
    public readonly node: ProviderNode,
    public readonly latestBenchmark: ProviderBenchmarkReport | null
  ) {}

  public toSnapshot(): ProviderInventorySummarySnapshot {
    return {
      node: this.node.toSnapshot(),
      latestBenchmark: this.latestBenchmark?.toSnapshot() ?? null
    };
  }
}
