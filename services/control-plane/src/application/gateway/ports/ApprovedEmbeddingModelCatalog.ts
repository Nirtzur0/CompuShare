import type { ApprovedEmbeddingModelManifest } from "../../../domain/gateway/ApprovedEmbeddingModelManifest.js";

export interface ApprovedEmbeddingModelCatalog {
  findByAlias(alias: string): ApprovedEmbeddingModelManifest | null;
  findByManifestId(manifestId: string): ApprovedEmbeddingModelManifest | null;
  listAll(): readonly ApprovedEmbeddingModelManifest[];
}
