import type { ApprovedChatModelManifest } from "../../../domain/gateway/ApprovedChatModelManifest.js";

export interface ApprovedChatModelCatalog {
  findByAlias(alias: string): ApprovedChatModelManifest | null;
  findByManifestId(manifestId: string): ApprovedChatModelManifest | null;
  listAll(): readonly ApprovedChatModelManifest[];
}
