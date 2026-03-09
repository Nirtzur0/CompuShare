import { DeployableWorkloadManifest } from "../../domain/workload/DeployableWorkloadManifest.js";
import { WorkloadManifestProvenanceReport } from "../../domain/workload/WorkloadManifestProvenanceReport.js";
import type { ApprovedChatModelCatalog } from "../gateway/ports/ApprovedChatModelCatalog.js";
import type { WorkloadManifestSignatureService } from "./ports/WorkloadManifestSignatureService.js";

export class GenerateWorkloadManifestProvenanceUseCase {
  public constructor(
    private readonly approvedChatModelCatalog: Pick<
      ApprovedChatModelCatalog,
      "listAll"
    >,
    private readonly signatureService: WorkloadManifestSignatureService,
    private readonly clock: () => Date = () => new Date()
  ) {}

  public execute(): WorkloadManifestProvenanceReport {
    const generatedAt = this.clock();
    const approvedManifests = this.approvedChatModelCatalog
      .listAll()
      .slice()
      .sort((left, right) => left.manifestId.localeCompare(right.manifestId));
    const signedManifests = approvedManifests.flatMap((manifest) =>
      manifest.supportedNodeRuntimes
        .slice()
        .sort((left, right) => left.localeCompare(right))
        .map((providerRuntime) =>
          this.signatureService.sign(
            DeployableWorkloadManifest.fromApprovedManifest({
              manifest,
              providerRuntime
            }),
            generatedAt
          )
        )
    );

    return WorkloadManifestProvenanceReport.create({
      generatedAt,
      manifests: signedManifests
    });
  }
}
