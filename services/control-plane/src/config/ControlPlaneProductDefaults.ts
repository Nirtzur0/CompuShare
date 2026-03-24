import { FraudDetectionPolicy } from "./FraudDetectionPolicy.js";
import { loadPlatformSubprocessorRegistry } from "./PlatformSubprocessorRegistry.js";
import { PlacementScoringPolicy } from "./PlacementScoringPolicy.js";
import { ProviderNodeAttestationPolicy } from "./ProviderNodeAttestationPolicy.js";
import { InMemoryApprovedChatModelCatalog } from "../infrastructure/gateway/InMemoryApprovedChatModelCatalog.js";
import { InMemoryApprovedEmbeddingModelCatalog } from "../infrastructure/gateway/InMemoryApprovedEmbeddingModelCatalog.js";

export interface ControlPlaneProductDefaults {
  approvedChatModelCatalog: InMemoryApprovedChatModelCatalog;
  approvedEmbeddingModelCatalog: InMemoryApprovedEmbeddingModelCatalog;
  placementScoringPolicy: PlacementScoringPolicy;
  fraudDetectionPolicy: FraudDetectionPolicy;
  providerNodeAttestationPolicy: ProviderNodeAttestationPolicy;
  platformSubprocessors: ReturnType<typeof loadPlatformSubprocessorRegistry>;
}

export function loadControlPlaneProductDefaults(): ControlPlaneProductDefaults {
  return {
    approvedChatModelCatalog: InMemoryApprovedChatModelCatalog.createDefault(),
    approvedEmbeddingModelCatalog:
      InMemoryApprovedEmbeddingModelCatalog.createDefault(),
    placementScoringPolicy: PlacementScoringPolicy.createDefault(),
    fraudDetectionPolicy: FraudDetectionPolicy.createDefault(),
    providerNodeAttestationPolicy:
      ProviderNodeAttestationPolicy.createDefault(),
    platformSubprocessors: loadPlatformSubprocessorRegistry()
  };
}
