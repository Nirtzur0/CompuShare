import { randomUUID } from "node:crypto";

export type ProviderPayoutRunStatus = "started" | "completed" | "failed";

export interface ProviderPayoutRunSnapshot {
  id: string;
  environment: string;
  providerOrganizationIdFilter: string | null;
  dryRun: boolean;
  status: ProviderPayoutRunStatus;
  startedAt: string;
  completedAt: string | null;
}

export class ProviderPayoutRun {
  private constructor(
    public readonly id: string,
    public readonly environment: string,
    public readonly providerOrganizationIdFilter: string | null,
    public readonly dryRun: boolean,
    public readonly status: ProviderPayoutRunStatus,
    public readonly startedAt: Date,
    public readonly completedAt: Date | null
  ) {}

  public static start(input: {
    environment: string;
    providerOrganizationIdFilter: string | null;
    dryRun: boolean;
    startedAt: Date;
  }): ProviderPayoutRun {
    return new ProviderPayoutRun(
      randomUUID(),
      input.environment,
      input.providerOrganizationIdFilter,
      input.dryRun,
      "started",
      input.startedAt,
      null
    );
  }

  public static rehydrate(input: {
    id: string;
    environment: string;
    providerOrganizationIdFilter: string | null;
    dryRun: boolean;
    status: ProviderPayoutRunStatus;
    startedAt: Date;
    completedAt: Date | null;
  }): ProviderPayoutRun {
    return new ProviderPayoutRun(
      input.id,
      input.environment,
      input.providerOrganizationIdFilter,
      input.dryRun,
      input.status,
      input.startedAt,
      input.completedAt
    );
  }

  public complete(completedAt: Date): ProviderPayoutRun {
    return new ProviderPayoutRun(
      this.id,
      this.environment,
      this.providerOrganizationIdFilter,
      this.dryRun,
      "completed",
      this.startedAt,
      completedAt
    );
  }

  public fail(completedAt: Date): ProviderPayoutRun {
    return new ProviderPayoutRun(
      this.id,
      this.environment,
      this.providerOrganizationIdFilter,
      this.dryRun,
      "failed",
      this.startedAt,
      completedAt
    );
  }

  public toSnapshot(): ProviderPayoutRunSnapshot {
    return {
      id: this.id,
      environment: this.environment,
      providerOrganizationIdFilter: this.providerOrganizationIdFilter,
      dryRun: this.dryRun,
      status: this.status,
      startedAt: this.startedAt.toISOString(),
      completedAt: this.completedAt?.toISOString() ?? null
    };
  }
}
