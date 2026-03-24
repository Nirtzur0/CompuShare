import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, "..");
const runtimeProcess = globalThis.process;

await Promise.all(
  [".next", "coverage"].map((entry) =>
    rm(resolve(workspaceRoot, entry), { force: true, recursive: true }),
  ),
);

const child = spawn("vitest", ["run", "--coverage"], {
  cwd: workspaceRoot,
  env: runtimeProcess.env,
  stdio: "inherit",
  shell: runtimeProcess.platform === "win32",
});

const exitCode = await new Promise((resolveExit, reject) => {
  child.on("error", reject);
  child.on("exit", (code) => resolveExit(code ?? 1));
});

runtimeProcess.exit(exitCode);
