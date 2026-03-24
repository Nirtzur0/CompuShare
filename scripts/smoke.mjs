import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = resolve(rootDir, "artifacts", "smoke");
const baseUrl = {
  controlPlane: "http://127.0.0.1:3100",
  providerRuntime: "http://127.0.0.1:3200",
  dashboard: "http://127.0.0.1:3000",
};
const providerRuntimeApiKey = "csk_provider_runtime_local_seed_secret_000000";
const processHandles = [];
let smokeDatabaseUrl = "";
let postgresContainerName = "";

async function main() {
  await mkdir(artifactsDir, { recursive: true });

  try {
    const databasePort = await resolveDatabasePort();
    smokeDatabaseUrl = `postgres://compushare:compushare@127.0.0.1:${String(databasePort)}/compushare`;
    postgresContainerName = `compushare-smoke-postgres-${Date.now().toString(36)}`;
    await runCommand(
      "docker",
      [
        "run",
        "--detach",
        "--rm",
        "--name",
        postgresContainerName,
        "--publish",
        `127.0.0.1:${String(databasePort)}:5432`,
        "--env",
        "POSTGRES_DB=compushare",
        "--env",
        "POSTGRES_USER=compushare",
        "--env",
        "POSTGRES_PASSWORD=compushare",
        "postgres:16-alpine",
      ],
      {
        logName: "docker-postgres-run",
      },
    );
    await waitForPostgres();

    const controlPlaneEnv = {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "3100",
      DATABASE_URL: smokeDatabaseUrl,
      WORKLOAD_BUNDLE_SIGNING_KEY: "local-workload-signing-secret-1234567890",
      WORKLOAD_BUNDLE_SIGNING_KEY_ID: "local-hmac-v1",
      COMPLIANCE_LEGAL_ENTITY_NAME: "CompuShare, Inc.",
      COMPLIANCE_PRIVACY_EMAIL: "privacy@example.com",
      COMPLIANCE_SECURITY_EMAIL: "security@example.com",
      COMPLIANCE_DPA_EFFECTIVE_DATE: "2026-03-10",
      COMPLIANCE_DPA_VERSION: "2026.03",
      CONTROL_PLANE_BASE_URL: baseUrl.controlPlane,
      PROVIDER_RUNTIME_BASE_URL: baseUrl.providerRuntime,
      PROVIDER_RUNTIME_API_KEY: providerRuntimeApiKey,
      DASHBOARD_BASE_URL: baseUrl.dashboard,
    };
    delete controlPlaneEnv.STRIPE_SECRET_KEY;
    delete controlPlaneEnv.STRIPE_WEBHOOK_SECRET;
    delete controlPlaneEnv.STRIPE_DISPUTE_WEBHOOK_SECRET;
    delete controlPlaneEnv.STRIPE_CONNECT_RETURN_URL_BASE;
    delete controlPlaneEnv.STRIPE_CONNECT_REFRESH_URL_BASE;

    const providerRuntimeEnv = {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "3200",
      CONTROL_PLANE_BASE_URL: baseUrl.controlPlane,
      PROVIDER_RUNTIME_API_KEY: providerRuntimeApiKey,
    };

    const dashboardEnv = {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "3000",
      CONTROL_PLANE_BASE_URL: baseUrl.controlPlane,
      NEXT_TELEMETRY_DISABLED: "1",
    };

    await startBackgroundProcess({
      name: "control-plane",
      command: "pnpm",
      args: ["--filter", "@compushare/control-plane", "dev"],
      env: controlPlaneEnv,
    });
    await waitForHttpServer(baseUrl.controlPlane, "control-plane");

    await startBackgroundProcess({
      name: "provider-runtime",
      command: "pnpm",
      args: ["--filter", "@compushare/provider-runtime", "dev"],
      env: providerRuntimeEnv,
    });
    await waitForHttpServer(baseUrl.providerRuntime, "provider-runtime");

    await startBackgroundProcess({
      name: "dashboard",
      command: "pnpm",
      args: [
        "--filter",
        "@compushare/dashboard",
        "exec",
        "next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3000",
      ],
      env: dashboardEnv,
    });
    await waitForHttpServer(baseUrl.dashboard, "dashboard");

    const seedOutput = await runCommand(
      "pnpm",
      [
        "--filter",
        "@compushare/control-plane",
        "exec",
        "tsx",
        "src/interfaces/cli/seedRunnableAlphaDemo.ts",
      ],
      {
        env: controlPlaneEnv,
        logName: "seed-demo",
      },
    );
    const seed = parseSeedResult(seedOutput.stdout);

    await assertChatCompletion(seed.buyer.apiKey.secret);
    await assertDashboardFetch(baseUrl.dashboard, "CompuShare dashboards");
    await assertBatchProcessing(seed.buyer.apiKey.secret, controlPlaneEnv);

    process.stdout.write("Smoke flow completed successfully.\n");
  } finally {
    await cleanup();
  }
}

async function assertChatCompletion(apiKey) {
  const response = await fetch(`${baseUrl.controlPlane}/v1/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b-like",
      messages: [{ role: "user", content: "Smoke test request." }],
    }),
  });
  await assertOk(response, "chat completion");
  const payload = await response.json();

  if (!Array.isArray(payload.choices) || payload.choices.length === 0) {
    throw new Error("Chat completion response did not include choices.");
  }
}

function parseSeedResult(stdout) {
  const marker = '{\n  "seedTag":';
  const jsonStart = stdout.lastIndexOf(marker);

  if (jsonStart === -1) {
    throw new Error("Seed CLI output did not include the final JSON payload.");
  }

  return JSON.parse(stdout.slice(jsonStart));
}

async function assertDashboardFetch(url, expectedText) {
  const response = await fetch(url);
  await assertOk(response, "dashboard page");
  const body = await response.text();

  if (!body.includes(expectedText)) {
    throw new Error(
      `Dashboard page did not render the expected text "${expectedText}".`,
    );
  }
}

async function assertBatchProcessing(apiKey, controlPlaneEnv) {
  const uploadForm = new FormData();
  uploadForm.set("purpose", "batch");
  uploadForm.set(
    "file",
    new Blob(
      [
        `${JSON.stringify({
          custom_id: "embed-smoke-1",
          method: "POST",
          url: "/v1/embeddings",
          body: { model: "cheap-embed-v1", input: "smoke test" },
        })}\n`,
      ],
      { type: "application/jsonl" },
    ),
    "smoke-batch.jsonl",
  );

  const uploadResponse = await fetch(`${baseUrl.controlPlane}/v1/files`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
    body: uploadForm,
  });
  await assertOk(uploadResponse, "file upload");
  const uploadPayload = await uploadResponse.json();

  const createResponse = await fetch(`${baseUrl.controlPlane}/v1/batches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      input_file_id: uploadPayload.id,
      endpoint: "/v1/embeddings",
      completion_window: "24h",
    }),
  });
  await assertOk(createResponse, "batch create");
  const batchPayload = await createResponse.json();

  const worker = await startBackgroundProcess({
    name: "batch-worker",
    command: "pnpm",
    args: ["--filter", "@compushare/control-plane", "worker:batch"],
    env: controlPlaneEnv,
  });

  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await fetch(
        `${baseUrl.controlPlane}/v1/batches/${batchPayload.id}`,
        {
          headers: {
            authorization: `Bearer ${apiKey}`,
          },
        },
      );
      await assertOk(response, "batch get");
      const payload = await response.json();

      if (payload.status === "completed") {
        if (payload.request_counts.completed !== 1) {
          throw new Error(
            "Batch completed without processing the expected item.",
          );
        }
        return;
      }

      if (payload.status === "failed" || payload.status === "cancelled") {
        throw new Error(`Batch entered terminal status ${payload.status}.`);
      }

      await delay(1_000);
    }

    throw new Error("Batch did not complete within the smoke test timeout.");
  } finally {
    await stopBackgroundProcess(worker);
  }
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await runCommand(
        "docker",
        [
          "exec",
          postgresContainerName,
          "pg_isready",
          "-U",
          "compushare",
          "-d",
          "compushare",
        ],
        {
          logName: "docker-postgres-health",
          allowFailure: true,
        },
      );
      return;
    } catch {
      await delay(1_000);
    }
  }

  throw new Error("Postgres did not become ready.");
}

async function waitForHttpServer(url, name) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "text/html,application/json" },
      });

      if (response.status < 500) {
        return;
      }
    } catch {}

    await delay(1_000);
  }

  throw new Error(`${name} did not become reachable at ${url}.`);
}

async function startBackgroundProcess({ name, command, args, env }) {
  const logPath = resolve(artifactsDir, `${name}.log`);
  const logStream = createWriteStream(logPath, { flags: "a" });
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  const handle = { name, child, logStream, logPath };
  processHandles.push(handle);
  return handle;
}

async function stopBackgroundProcess(handle) {
  const index = processHandles.indexOf(handle);
  if (index >= 0) {
    processHandles.splice(index, 1);
  }

  if (handle.child.exitCode === null && handle.child.signalCode === null) {
    handle.child.kill("SIGTERM");
    await Promise.race([
      onceProcessExit(handle.child),
      delay(10_000).then(() => {
        if (
          handle.child.exitCode === null &&
          handle.child.signalCode === null
        ) {
          handle.child.kill("SIGKILL");
        }
      }),
    ]);
  }

  await new Promise((resolve) => handle.logStream.end(resolve));
}

async function cleanup() {
  for (const handle of [...processHandles].reverse()) {
    await stopBackgroundProcess(handle);
  }

  try {
    if (postgresContainerName.length > 0) {
      await runCommand("docker", ["rm", "-f", postgresContainerName], {
        logName: "docker-postgres-stop",
        allowFailure: true,
      });
    }
  } catch {}
}

async function resolveDatabasePort() {
  if (
    process.env.SMOKE_DATABASE_PORT !== undefined &&
    process.env.SMOKE_DATABASE_PORT.trim().length > 0
  ) {
    return Number.parseInt(process.env.SMOKE_DATABASE_PORT, 10);
  }

  return await findOpenPort();
}

async function findOpenPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close(() =>
          reject(new Error("Could not resolve an open port.")),
        );
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function runCommand(command, args, options = {}) {
  const logPath = options.logName
    ? resolve(artifactsDir, `${options.logName}.log`)
    : null;
  const child = spawn(command, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  if (logPath !== null) {
    const logLines = [
      `$ ${command} ${args.join(" ")}`,
      stdout.trimEnd(),
      stderr.trimEnd(),
    ]
      .filter((line) => line.length > 0)
      .join("\n\n");
    await writeFile(logPath, `${logLines}\n`, "utf8");
  }

  if (exitCode !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} exited with code ${String(exitCode)}.\n${stderr || stdout}`,
    );
  }

  return { stdout, stderr, exitCode };
}

async function assertOk(response, operation) {
  if (response.ok) {
    return;
  }

  throw new Error(
    `${operation} failed with ${response.status}: ${await response.text()}`,
  );
}

function onceProcessExit(child) {
  return new Promise((resolve) => {
    child.once("close", resolve);
  });
}

process.on("SIGINT", async () => {
  await cleanup();
  process.exitCode = 130;
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exitCode = 143;
});

main().catch(async (error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unknown smoke error"}\n`,
  );
  await cleanup();
  process.exitCode = 1;
});
