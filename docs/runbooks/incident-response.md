# Incident Response Runbook

## Purpose

This runbook defines how CompuShare declares, contains, communicates, and closes launch-phase incidents across the control-plane, provider runtime, batch worker, dashboard, payouts, disputes, and private connector surfaces.

## Incident severities

### SEV0

- Confirmed customer-impacting security event, active data exposure, or irreversible finance event in progress.
- Examples:
  - provider payout or dispute state is corrupted in a way that can create incorrect cash movement
  - customer data is exposed to an unauthorized organization
  - signed workload enforcement is bypassed in production

### SEV1

- Major production outage or degraded core path for a material share of traffic with no known safe workaround.
- Examples:
  - gateway admission starts rejecting healthy traffic due to quota or `429` regression
  - provider-runtime admission failures block most sync traffic
  - batch worker cannot drain queued jobs

### SEV2

- Partial degradation with bounded blast radius, a safe workaround, or impact limited to one feature family.
- Examples:
  - private connector readiness failures for one buyer environment
  - provider dispute dashboard mismatch that does not alter ledger truth
  - payout onboarding is blocked for one provider cohort

### SEV3

- Low-blast-radius defect, observability gap, or support issue that does not currently threaten SLOs or finance correctness.
- Examples:
  - one support macro is stale
  - a non-critical dashboard card is inaccurate while APIs remain correct

## Declaration criteria

Declare an incident immediately when any of the following is true:

- the blast radius or root cause is still uncertain but the affected path is customer-facing or finance-sensitive
- customer-visible gateway success is materially degraded
- payout, dispute, or ledger correctness may be at risk
- a security or privacy concern might require evidence preservation

Do not wait for full diagnosis before declaring. Early declaration is preferred to silent triage.

## Incident roles

- Incident commander:
  - owns severity, priorities, and closure criteria
  - keeps containment and recovery work focused
- Ops lead:
  - drives technical triage and assigns mitigation tasks
  - ensures logs, metrics, and audit events are preserved
- Comms lead:
  - drafts internal updates and any customer-facing status messages
  - maintains update cadence against severity
- Scribe:
  - records timeline, decisions, owner assignments, and evidence links

One person may hold multiple roles only for `SEV2` or `SEV3`. `SEV0` and `SEV1` require distinct incident commander and scribe roles.

## Immediate containment checklists

### Gateway `429` or quota regression

1. Confirm whether the failure is request-rate, fixed-day quota, or reservation estimation related.
2. Check the latest `gateway.*` admission logs and dashboard quota views.
3. Verify the active gateway environment variables and most recent deploy SHA.
4. Freeze additional config changes until the cause is understood.
5. If healthy buyers are being rejected incorrectly, roll back the offending config or deploy before modifying limits manually.

### Provider-runtime admission failures

1. Confirm whether failures are signature verification, org auth, provider node identity, or manifest mismatch.
2. Preserve the relevant signed bundle IDs, manifest IDs, key IDs, and provider node IDs.
3. Check provider-runtime health and runtime-admission audit logs before retrying workloads.
4. If admission is failing broadly, pause new workload dispatch until safe admission is restored.

### Private connector stale or not-ready failures

1. Confirm whether the connector missed check-ins, failed runtime admission, or lost upstream connectivity.
2. Preserve connector ID, organization ID, environment, runtime version, and last successful check-in timestamp.
3. Validate the buyer intended private routing and that there was no marketplace fallback.
4. If the stale state is systemic, stop advising buyers to retry until readiness is stable again.

### Payout, dispute, or security incident

1. Stop any manual finance action that could amplify the issue.
2. Preserve all relevant audit events, webhook IDs, dispute IDs, payout IDs, payment references, and actor IDs.
3. Confirm whether the incident affects ledger truth, payout eligibility, or only a read model.
4. Escalate immediately to the finance owner and incident commander.
5. For suspected security events, rotate only the minimum required credentials after evidence capture.

## Evidence preservation

- Do not delete or rewrite audit logs during active response.
- Preserve:
  - request IDs
  - trace IDs
  - webhook event IDs
  - dispute IDs
  - payout IDs
  - organization IDs
  - actor user IDs
  - provider node IDs
  - private connector IDs
- Record the first known bad timestamp and first confirmed good timestamp.
- Capture config values by reference, not by copying secrets into notes.
- If a security incident is suspected, open a restricted evidence document and limit access to named responders only.

## Communication cadence

- `SEV0`: internal updates every `15 minutes`; customer update within `30 minutes` if customer impact is confirmed
- `SEV1`: internal updates every `30 minutes`; customer update within `60 minutes` if customer impact is confirmed
- `SEV2`: internal updates every `60 minutes`; customer update when workaround or ETA is credible
- `SEV3`: issue tracking update only

Every update must include:

- current severity
- affected surfaces
- known blast radius
- current mitigation
- next update time

## Handoff rules

- Handoffs require a current timeline, open actions, known risks, and explicit owner transfer.
- Never hand off only by chat scrollback.
- If the incident spans a shift change, the outgoing incident commander remains on call until the incoming commander confirms context.

## Recovery and closure

An incident is ready to close only when:

- customer impact has stopped
- the path is stable under current traffic
- finance and security owners agree no additional containment action is needed
- follow-up work items are created for any residual gaps

## Postmortem checklist

- summarize customer impact, blast radius, and duration
- record root cause and why existing controls did or did not catch it
- list the exact evidence sources used
- document permanent fixes, owners, and due dates
- update release-gate readiness if the incident reveals a blocked launch condition
