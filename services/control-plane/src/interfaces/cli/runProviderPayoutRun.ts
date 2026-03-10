import "dotenv/config";
import { Pool } from "pg";
import { loadControlPlaneSettings } from "../../config/ControlPlaneSettings.js";
import { IdentitySchemaInitializer } from "../../infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../infrastructure/persistence/postgres/PostgresIdentityRepository.js";
import { StructuredConsoleAuditLog } from "../../infrastructure/observability/StructuredConsoleAuditLog.js";
import { StripeSdkConnectClient } from "../../infrastructure/payments/StripeConnectClient.js";
import { RunProviderPayoutRunUseCase } from "../../application/payout/RunProviderPayoutRunUseCase.js";

export async function runProviderPayoutRun(): Promise<void> {
  const settings = loadControlPlaneSettings(process.env);

  if (
    settings.stripeSecretKey === undefined ||
    settings.stripeWebhookSecret === undefined
  ) {
    throw new Error(
      "Stripe payout execution requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET."
    );
  }

  const args = parseArgs(process.argv.slice(2));
  const pool = new Pool({ connectionString: settings.databaseUrl });

  try {
    await new IdentitySchemaInitializer(pool).ensureSchema();
    const repository = new PostgresIdentityRepository(pool);
    const auditLog = new StructuredConsoleAuditLog();
    const useCase = new RunProviderPayoutRunUseCase(
      repository,
      new StripeSdkConnectClient(
        settings.stripeSecretKey,
        settings.stripeWebhookSecret
      ),
      auditLog
    );
    const result = await useCase.execute({
      environment: args.environment,
      ...(args.providerOrganizationId === undefined
        ? {}
        : { providerOrganizationId: args.providerOrganizationId }),
      dryRun: args.dryRun
    });

    console.info(JSON.stringify(result, null, 2));
    console.info(
      [
        `payoutRun=${result.payoutRun.id}`,
        `environment=${result.payoutRun.environment}`,
        `dryRun=${String(result.payoutRun.dryRun)}`,
        `attemptedOrganizations=${String(result.payoutRun.attemptedOrganizations)}`,
        `submittedDisbursements=${String(result.payoutRun.submittedDisbursements)}`,
        `skippedOrganizations=${String(result.payoutRun.skippedOrganizations)}`
      ].join(" ")
    );
  } finally {
    await pool.end();
  }
}

export function parseArgs(argv: readonly string[]): {
  environment: string;
  providerOrganizationId?: string;
  dryRun: boolean;
} {
  let environment = "development";
  let providerOrganizationId: string | undefined;
  let dryRun = true;

  for (const arg of argv) {
    if (arg.startsWith("--environment=")) {
      environment = arg.slice("--environment=".length);
      continue;
    }

    if (arg.startsWith("--provider-organization-id=")) {
      providerOrganizationId = arg.slice("--provider-organization-id=".length);
      continue;
    }

    if (arg.startsWith("--dry-run=")) {
      dryRun = arg.slice("--dry-run=".length) !== "false";
    }
  }

  return providerOrganizationId === undefined
    ? {
        environment,
        dryRun
      }
    : {
        environment,
        providerOrganizationId,
        dryRun
      };
}

export function isDirectExecution(
  moduleUrl: string,
  entrypointPath: string | undefined
): boolean {
  return entrypointPath !== undefined && moduleUrl.endsWith(entrypointPath);
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  runProviderPayoutRun().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Unknown error"}\n`
    );
    process.exitCode = 1;
  });
}
