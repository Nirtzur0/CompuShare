import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createOperationsRunbookCatalog } from "../../../src/domain/operations/OperationsRunbookCatalog.js";

describe("OperationsRunbookCatalog", () => {
  it("defines the three canonical launch runbooks", () => {
    const catalog = createOperationsRunbookCatalog();

    expect(catalog.entries.map((entry) => entry.slug)).toEqual([
      "incident-response",
      "on-call-rotation",
      "support-escalation",
    ]);
  });

  it("points every catalog entry to a real repo-tracked markdown file", () => {
    const catalog = createOperationsRunbookCatalog();

    for (const entry of catalog.entries) {
      expect(
        existsSync(resolve(process.cwd(), "..", "..", entry.canonicalDocumentPath)),
      ).toBe(true);
    }
  });
});
