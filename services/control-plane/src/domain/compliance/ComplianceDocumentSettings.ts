export interface ComplianceDocumentSettingsSnapshot {
  legalEntityName: string;
  privacyEmail: string;
  securityEmail: string;
  dpaEffectiveDate: string;
  dpaVersion: string;
}

export class ComplianceDocumentSettings {
  private constructor(
    private readonly snapshot: ComplianceDocumentSettingsSnapshot
  ) {}

  public static create(
    snapshot: ComplianceDocumentSettingsSnapshot
  ): ComplianceDocumentSettings {
    return new ComplianceDocumentSettings({ ...snapshot });
  }

  public toSnapshot(): ComplianceDocumentSettingsSnapshot {
    return { ...this.snapshot };
  }
}
