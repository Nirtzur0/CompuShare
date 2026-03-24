export interface OperationsRunbookEntry {
  slug: "incident-response" | "on-call-rotation" | "support-escalation";
  title: string;
  summary: string;
  canonicalDocumentPath: string;
  coveredReleaseGates: string[];
  coveredSurfaces: string[];
}

export interface OperationsRunbookCatalog {
  title: string;
  summary: string;
  entries: OperationsRunbookEntry[];
}

const OPERATIONS_RUNBOOK_CATALOG: OperationsRunbookCatalog = {
  title: "CompuShare launch operations runbooks",
  summary:
    "Canonical launch-prep runbooks tracked in the repository. The public operations page indexes these documents without replacing them.",
  entries: [
    {
      slug: "incident-response",
      title: "Incident response",
      summary:
        "Severity model, declaration criteria, containment checklists, evidence preservation, communications cadence, and postmortem closure rules.",
      canonicalDocumentPath: "docs/runbooks/incident-response.md",
      coveredReleaseGates: ["Incident response runbook complete"],
      coveredSurfaces: [
        "gateway quota and 429 regressions",
        "provider-runtime admission failures",
        "private connector readiness incidents",
        "payout, dispute, and security incidents",
      ],
    },
    {
      slug: "on-call-rotation",
      title: "On-call rotation",
      summary:
        "Launch-week primary and secondary coverage template, handoff rules, service ownership map, and escalation ladder.",
      canonicalDocumentPath: "docs/runbooks/on-call-rotation.md",
      coveredReleaseGates: ["On-call rotation defined"],
      coveredSurfaces: [
        "control-plane",
        "provider-runtime",
        "batch worker",
        "dashboard",
        "Stripe payout and dispute paths",
      ],
    },
    {
      slug: "support-escalation",
      title: "Support escalation",
      summary:
        "Support macros, escalation owners, and minimum metadata requirements for launch and early beta escalations.",
      canonicalDocumentPath: "docs/runbooks/support-escalation.md",
      coveredReleaseGates: ["Support macros and escalation paths defined"],
      coveredSurfaces: [
        "gateway quota questions",
        "payout onboarding blockers",
        "provider dispute hold questions",
        "private connector stale alerts",
        "batch failures",
        "provider attestation and routing issues",
      ],
    },
  ],
};

export function createOperationsRunbookCatalog(): OperationsRunbookCatalog {
  return {
    ...OPERATIONS_RUNBOOK_CATALOG,
    entries: OPERATIONS_RUNBOOK_CATALOG.entries.map((entry) => ({
      ...entry,
      coveredReleaseGates: [...entry.coveredReleaseGates],
      coveredSurfaces: [...entry.coveredSurfaces],
    })),
  };
}
