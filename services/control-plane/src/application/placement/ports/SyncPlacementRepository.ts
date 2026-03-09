import type { PlacementDecisionLog } from "../../../domain/placement/PlacementDecisionLog.js";
import type { PlacementCandidateRepository } from "./PlacementCandidateRepository.js";

export interface SyncPlacementRepository extends PlacementCandidateRepository {
  createPlacementDecisionLog(log: PlacementDecisionLog): Promise<void>;
}
