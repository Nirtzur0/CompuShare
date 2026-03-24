# Support Escalation and Macro Runbook

## Purpose

This runbook defines the minimum data to collect before escalation and the macro templates support should use during launch-prep and early beta.

## Required metadata before escalation

Collect these fields before handing off unless the customer is blocked by an active `SEV0` or `SEV1`:

- organization ID
- actor user ID or requester email
- environment
- request ID, trace ID, or timestamp
- relevant resource IDs:
  - API key ID
  - provider node ID
  - private connector ID
  - dispute ID
  - payout ID
  - batch ID
- exact error text or screenshot summary
- whether the issue is ongoing, intermittent, or already resolved

## Escalation ownership rules

- gateway auth, quota, batch, or routing issues:
  - platform engineering lead
- provider-runtime or private connector failures:
  - runtime/infra lead
- payout, onboarding, or dispute questions:
  - finance/operations lead
- dashboard rendering or download issues:
  - dashboard/application lead
- security or privacy concerns:
  - incident commander or security owner immediately

## Macro templates

### Gateway rate limit or quota rejection

Subject: CompuShare request blocked by gateway quota or rate limit

Hello {{customer_name}},

We confirmed your request was rejected by gateway admission controls for organization `{{organization_id}}` in `{{environment}}`.

What we need from you:

- approximate timestamp of the failed request
- request ID or trace ID if available
- the exact error body you received

We are reviewing whether this is expected quota usage or an admission-control regression. We will update you by `{{next_update_time}}`.

### Payout onboarding blocked

Subject: CompuShare payout onboarding follow-up

Hello {{provider_name}},

We are reviewing the payout onboarding issue for organization `{{organization_id}}`.

Please send:

- the onboarding URL return time
- any visible Stripe or platform error text
- whether the issue happens on refresh or on first completion

We will confirm whether this is a missing requirement, webhook delay, or onboarding-path issue and update you by `{{next_update_time}}`.

### Provider dispute hold question

Subject: CompuShare provider dispute hold review

Hello {{provider_name}},

We received your question about dispute hold exposure for organization `{{organization_id}}`.

To investigate quickly, please include:

- dispute ID if visible
- payment reference or job reference
- whether you believe the dispute is settlement-related or chargeback-related

We will confirm current dispute status, active hold amount, and next finance review step by `{{next_update_time}}`.

### Private connector stale or not ready

Subject: CompuShare private connector readiness follow-up

Hello {{customer_name}},

Your private connector `{{private_connector_id}}` in `{{environment}}` is currently reporting a stale or not-ready state.

Please send:

- the last time the connector runtime was restarted
- the local runtime version
- any recent upstream connectivity or credential changes

We are checking connector check-ins and runtime-admission logs now and will update you by `{{next_update_time}}`.

### Batch stuck or failed

Subject: CompuShare batch processing follow-up

Hello {{customer_name}},

We are investigating the batch issue for batch `{{batch_id}}`.

Please share:

- the input file upload time
- whether the batch is stuck in `in_progress` or failed
- any error file ID already shown to you

We will confirm worker status and the next recovery step by `{{next_update_time}}`.

### Provider attestation or routing issue

Subject: CompuShare provider routing or attestation follow-up

Hello {{provider_name}},

We are checking the routing or attestation issue for node `{{provider_node_id}}`.

Please include:

- node label and machine ID
- latest benchmark submission time
- latest attestation or routing-state update time

We will confirm whether the issue is trust-tier, health, or placement related and update you by `{{next_update_time}}`.

## Escalation checklist

Before escalating, confirm:

- the correct owner is tagged
- the required metadata above is included
- any customer promise or deadline is copied into the escalation
- the current severity is stated if an incident is already declared
