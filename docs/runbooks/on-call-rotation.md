# On-Call Rotation and Escalation Runbook

## Purpose

This runbook defines launch-week on-call structure, ownership boundaries, and escalation expectations for CompuShare.

## Launch-week rotation template

Maintain one primary and one secondary responder for every launch-week day.

| Day | Primary | Secondary | Coverage window |
|---|---|---|---|
| Monday | Platform engineering lead | Dashboard/application lead | 08:00-20:00 local launch timezone |
| Tuesday | Platform engineering lead | Finance/operations lead | 08:00-20:00 local launch timezone |
| Wednesday | Runtime/infra lead | Platform engineering lead | 08:00-20:00 local launch timezone |
| Thursday | Finance/operations lead | Runtime/infra lead | 08:00-20:00 local launch timezone |
| Friday | Platform engineering lead | Finance/operations lead | 08:00-20:00 local launch timezone |

Outside the listed window, the primary remains the first responder and the secondary is the immediate escalation backup.

## Role expectations

### Primary

- acknowledges new incidents and urgent support escalations
- owns first triage within `15 minutes` for `SEV0` or `SEV1`
- decides whether to escalate to secondary or named surface owner

### Secondary

- joins any declared `SEV0` or `SEV1`
- takes over if the primary is unreachable within the response budget
- supports handoff and containment work

## Handoff expectations

At every daily handoff, the outgoing primary shares:

- open incidents and their severities
- unresolved support escalations
- pending deploys or risky config changes
- finance-sensitive items involving payouts or disputes
- any customer commitments made during the previous shift

## Service ownership map

### Control-plane

- Owner: platform engineering lead
- Escalate for:
  - auth, gateway admission, routing, finance APIs, compliance exports

### Provider runtime

- Owner: runtime/infra lead
- Escalate for:
  - workload admission failures
  - sync inference forwarding failures
  - private connector runtime forwarding failures

### Batch worker

- Owner: platform engineering lead
- Escalate for:
  - stuck active batches
  - repeated worker crashes
  - output/error file write failures

### Dashboard

- Owner: dashboard/application lead
- Escalate for:
  - SSR failures
  - broken buyer/provider operational views
  - public transparency or operations page issues

### Stripe payout and dispute surfaces

- Owner: finance/operations lead
- Escalate for:
  - onboarding blocked
  - payout availability mismatch
  - dispute hold or webhook reconciliation errors

## Escalation ladder

1. Primary on-call
2. Secondary on-call
3. Named surface owner from the service ownership map
4. Founder or launch duty manager for customer-impacting `SEV0` or `SEV1`

Security or privacy concerns skip directly to the founder or security owner after the primary is paged.

## Response-time targets

- `SEV0`: acknowledge within `5 minutes`
- `SEV1`: acknowledge within `15 minutes`
- `SEV2`: acknowledge within `60 minutes`
- `SEV3`: acknowledge within one business day

## Change freeze guidance

During launch week, no risky infra or finance-path change ships without:

- a named owner
- rollback plan
- post-deploy verification window
- explicit notification to the current primary on-call
