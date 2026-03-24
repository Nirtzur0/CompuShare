import { SubprocessorRegistry } from "../../domain/compliance/SubprocessorRegistry.js";
import type { ComplianceDocumentSettings } from "../../domain/compliance/ComplianceDocumentSettings.js";
import type { PlatformSubprocessor } from "../../domain/compliance/PlatformSubprocessor.js";

export interface GetSubprocessorRegistryResponse {
  registry: ReturnType<SubprocessorRegistry["toSnapshot"]>;
}

export class GetSubprocessorRegistryUseCase {
  public constructor(
    private readonly settings: ComplianceDocumentSettings,
    private readonly platformSubprocessors: readonly PlatformSubprocessor[],
    private readonly clock: () => Date = () => new Date()
  ) {}

  public execute(): GetSubprocessorRegistryResponse {
    const registry = SubprocessorRegistry.create({
      generatedAt: this.clock(),
      settings: this.settings.toSnapshot(),
      environment: null,
      platformSubprocessors: this.platformSubprocessors.map((entry) =>
        entry.toSnapshot()
      )
    });

    return {
      registry: registry.toSnapshot()
    };
  }
}
