import { afterEach, describe, expect, it, vi } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";

interface PgMemModule {
  Pool: new () => Pool;
}

let poolFactory: (() => Pool) | undefined;

function MockPool(this: object) {
  if (poolFactory === undefined) {
    throw new Error("Pool factory was not configured for the test.");
  }

  return poolFactory();
}

vi.mock("pg", () => ({
  Pool: MockPool
}));

describe("seedRunnableAlphaDemo CLI", () => {
  afterEach(() => {
    poolFactory = undefined;
    vi.resetModules();
  });

  it("seeds demo data through the CLI wrapper and formats a readable summary", async () => {
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const pgAdapter = database.adapters.createPg() as unknown as PgMemModule;
    poolFactory = () => new pgAdapter.Pool();

    const { formatSeedRunnableAlphaDemoSummary, seedRunnableAlphaDemoCli } =
      await import("../../../src/interfaces/cli/seedRunnableAlphaDemo.js");
    const result = await seedRunnableAlphaDemoCli({
      environment: {
        DATABASE_URL:
          "postgres://compushare:compushare@127.0.0.1:5432/compushare",
        CONTROL_PLANE_BASE_URL: "http://127.0.0.1:3100",
        PROVIDER_RUNTIME_BASE_URL: "http://127.0.0.1:3200",
        PROVIDER_RUNTIME_API_KEY:
          "csk_provider_runtime_local_seed_secret_000000",
        DASHBOARD_BASE_URL: "http://127.0.0.1:3000"
      },
      seedTag: "cli-demo",
      clock: () => new Date("2026-03-09T13:00:00.000Z")
    });

    const summary = formatSeedRunnableAlphaDemoSummary(result);

    expect(result.seedTag).toBe("cli-demo");
    expect(result.buyer.dashboardUrl).toContain("/consumer?");
    expect(result.provider.dashboardUrl).toContain("/provider?");
    expect(result.provider.pricingDashboardUrl).toContain("/provider/pricing?");
    expect(result.provider.node.label).toBe("Runnable Alpha Warm Node");
    expect(result.provider.apiKey.secret).toBe(
      "csk_provider_runtime_local_seed_secret_000000"
    );
    expect(result.provider.routingProfile.endpointUrl).toContain(
      "http://127.0.0.1:3200/v1/chat/completions?"
    );
    expect(result.buyer.consumerOverview.balances.usageBalanceUsd).toBe(
      "50.00"
    );
    expect(result.provider.providerOverview.balances.pendingEarningsUsd).toBe(
      "42.00"
    );
    expect(result.gatewayDemo.curlCommand).toContain(
      "http://127.0.0.1:3100/v1/chat/completions"
    );
    expect(result.embeddingDemo.curlCommand).toContain(
      "http://127.0.0.1:3100/v1/embeddings"
    );
    expect(result.batchDemo.uploadCurlCommand).toContain(
      "http://127.0.0.1:3100/v1/files"
    );
    expect(result.batchDemo.createCurlCommand).toContain(
      "http://127.0.0.1:3100/v1/batches"
    );
    expect(result.batchDemo.workerCommand).toBe("pnpm dev:batch-worker");
    expect(summary).toContain("Seeded runnable alpha demo data.");
    expect(summary).toContain(result.buyer.dashboardUrl);
    expect(summary).toContain(result.provider.pricingDashboardUrl);
    expect(summary).toContain(result.provider.apiKey.secret);
    expect(summary).toContain(result.gatewayDemo.curlCommand);
    expect(summary).toContain(result.embeddingDemo.curlCommand);
    expect(summary).toContain(result.batchDemo.uploadCurlCommand);
    expect(summary).toContain(result.batchDemo.workerCommand);
  });

  it("writes JSON to stdout and a readable summary to stderr through main()", async () => {
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const pgAdapter = database.adapters.createPg() as unknown as PgMemModule;
    poolFactory = () => new pgAdapter.Pool();

    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const originalEnvironment = process.env;
    process.env = {
      ...originalEnvironment,
      DATABASE_URL:
        "postgres://compushare:compushare@127.0.0.1:5432/compushare",
      CONTROL_PLANE_BASE_URL: "http://127.0.0.1:3100",
      PROVIDER_RUNTIME_BASE_URL: "http://127.0.0.1:3200",
      PROVIDER_RUNTIME_API_KEY: "csk_provider_runtime_local_seed_secret_000000",
      DASHBOARD_BASE_URL: "http://127.0.0.1:3000"
    };

    try {
      const module =
        await import("../../../src/interfaces/cli/seedRunnableAlphaDemo.js");

      await module.main();

      expect(stdoutWrite).toHaveBeenCalled();
      expect(
        stdoutWrite.mock.calls.some(([value]) =>
          String(value).includes('"buyer"')
        )
      ).toBe(true);
      expect(
        stderrWrite.mock.calls.some(([value]) =>
          String(value).includes("Seeded runnable alpha demo data.")
        )
      ).toBe(true);
    } finally {
      process.env = originalEnvironment;
      stdoutWrite.mockRestore();
      stderrWrite.mockRestore();
    }
  });

  it("reports whether a module URL is the direct entrypoint", async () => {
    const { isDirectExecution } =
      await import("../../../src/interfaces/cli/seedRunnableAlphaDemo.js");

    expect(
      isDirectExecution(
        "file:///workspace/src/interfaces/cli/seedRunnableAlphaDemo.ts",
        "/workspace/src/interfaces/cli/seedRunnableAlphaDemo.ts"
      )
    ).toBe(true);
    expect(
      isDirectExecution(
        "file:///workspace/src/interfaces/cli/seedRunnableAlphaDemo.ts",
        undefined
      )
    ).toBe(false);
  });
});
