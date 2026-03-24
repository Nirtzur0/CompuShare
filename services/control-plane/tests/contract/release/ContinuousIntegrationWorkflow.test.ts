import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ci workflow", () => {
  it("checks in the repo verify and smoke jobs", async () => {
    const workflowPath = resolve(
      process.cwd(),
      "../../.github/workflows/ci.yml"
    );
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("name: ci");
    expect(workflow).toContain('node-version-file: ".nvmrc"');
    expect(workflow).toContain("run: pnpm install --frozen-lockfile");
    expect(workflow).toContain("run: pnpm verify");
    expect(workflow).toContain("run: pnpm smoke");
    expect(workflow).toContain("name: Upload smoke logs");
  });
});
