# CompuShare Runnable Alpha

Local alpha for the `services/control-plane` Fastify API and the `apps/dashboard` Next.js shell.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker with `docker compose`

## Local setup

1. Install dependencies:

```bash
pnpm install --frozen-lockfile
```

2. Prepare service env files:

```bash
cp services/control-plane/.env.example services/control-plane/.env
cp services/provider-runtime/.env.example services/provider-runtime/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

3. Start Postgres:

```bash
pnpm dev:infra:up
```

4. Start the control-plane API:

```bash
pnpm dev:control-plane
```

5. Start the local provider runtime:

```bash
pnpm dev:provider-runtime
```

6. Start the batch worker when you want to process uploaded batch jobs:

```bash
pnpm dev:batch-worker
```

7. Seed demo data. The command prints JSON to stdout and a readable summary with the public operations index, public subprocessor transparency, buyer dashboard, buyer dispute dashboard, buyer private connector dashboard, buyer compliance dashboard, provider overview, provider dispute dashboard, provider pricing simulator, DPA export, chat, private connector, embeddings, and batch demo commands:

```bash
pnpm seed:demo
```

8. Start the dashboard:

```bash
pnpm dev:dashboard
```

The dashboard runs on `http://127.0.0.1:3000` by default. The control-plane runs on `http://127.0.0.1:3100` by default. The local provider runtime runs on `http://127.0.0.1:3200` by default.

## Operations runbooks

The dashboard exposes a public operations index at:

```text
http://127.0.0.1:3000/operations
```

That page is an index only. The canonical runbooks live in the repository:

- [docs/runbooks/incident-response.md](/Users/nirtzur/Documents/projects/CompuShare/docs/runbooks/incident-response.md)
- [docs/runbooks/on-call-rotation.md](/Users/nirtzur/Documents/projects/CompuShare/docs/runbooks/on-call-rotation.md)
- [docs/runbooks/support-escalation.md](/Users/nirtzur/Documents/projects/CompuShare/docs/runbooks/support-escalation.md)

The runbooks cover the release-gate evidence for incident response, on-call rotation, and support escalation readiness.

## End-to-end gateway demo

After seeding, run the emitted curl command against the control-plane gateway. The request will route to the local provider runtime, the provider runtime will call control-plane runtime admission with its scoped provider API key, and the mock completion response will come back through the real gateway path.

## Gateway rate-limit and quota hardening

The control-plane now enforces deterministic gateway admission controls before upstream dispatch:

- per-API-key sync request rate limits
- per-organization/environment fixed-day token quotas
- per-job batch item caps
- per-organization/environment active batch caps

### Control-plane env knobs

Set these in [services/control-plane/.env.example](/Users/nirtzur/Documents/projects/CompuShare/services/control-plane/.env.example) or your local `.env`:

- `GATEWAY_SYNC_REQUESTS_PER_MINUTE_PER_API_KEY`
- `GATEWAY_FIXED_DAY_TOKEN_QUOTA_PER_ORG_ENV`
- `GATEWAY_MAX_BATCH_ITEMS_PER_JOB`
- `GATEWAY_MAX_ACTIVE_BATCHES_PER_ORG_ENV`
- `GATEWAY_DEFAULT_CHAT_MAX_TOKENS_RESERVATION`

### Low-limit local verification

Use very small limits locally, restart `pnpm dev:control-plane`, then replay the emitted seed curl commands:

```bash
GATEWAY_SYNC_REQUESTS_PER_MINUTE_PER_API_KEY=1
GATEWAY_FIXED_DAY_TOKEN_QUOTA_PER_ORG_ENV=100
GATEWAY_MAX_BATCH_ITEMS_PER_JOB=1
GATEWAY_MAX_ACTIVE_BATCHES_PER_ORG_ENV=1
GATEWAY_DEFAULT_CHAT_MAX_TOKENS_RESERVATION=64
```

The second sync request in the same minute or a request whose estimated tokens exceed the remaining fixed-day budget will return `429 Too Many Requests` with structured metadata and `Retry-After`, for example:

```json
{
  "error": "GATEWAY_REQUEST_RATE_LIMIT_EXCEEDED",
  "message": "Gateway request rate limit exceeded.",
  "metadata": {
    "limit": 1,
    "used": 1,
    "remaining": 0,
    "windowStartedAt": "2026-03-11T10:00:00.000Z",
    "windowResetsAt": "2026-03-11T10:01:00.000Z"
  }
}
```

Batch creation is also blocked deterministically when a file exceeds `GATEWAY_MAX_BATCH_ITEMS_PER_JOB` or the organization already has `GATEWAY_MAX_ACTIVE_BATCHES_PER_ORG_ENV` non-terminal jobs.

### Consumer quota visibility

The buyer dashboard overview now requires an explicit environment query param because the quota snapshot is environment-scoped:

```text
http://127.0.0.1:3000/consumer?organizationId=<buyer_org_id>&actorUserId=<buyer_finance_user_id>&environment=development
```

That view shows additive gateway quota status only. It does not change ledger balances.

## Private connector demo

The control-plane also supports buyer-scoped private connectors. After `pnpm seed:demo`, open the emitted buyer private connector dashboard URL or use this form:

```text
http://127.0.0.1:3000/consumer/private-connectors?organizationId=<buyer_org_id>&actorUserId=<buyer_finance_user_id>
```

The seeded demo creates one `cluster` connector that points at the provider-runtime private connector endpoint. The gateway only routes privately when you send `x-compushare-private-connector-id`:

```bash
curl -sS \
  -H "Authorization: Bearer <buyer_api_key>" \
  -H "Content-Type: application/json" \
  -H "x-compushare-private-connector-id: <private_connector_id>" \
  -X POST http://127.0.0.1:3100/v1/chat/completions \
  -d '{"model":"openai/gpt-oss-120b-like","messages":[{"role":"user","content":"Route this request through the private connector."}]}'
```

### Private connector runtime mode

To run `services/provider-runtime` as a private connector instead of a marketplace provider node, set these env vars in [services/provider-runtime/.env.example](/Users/nirtzur/Documents/projects/CompuShare/services/provider-runtime/.env.example) or your local `.env`:

- `PRIVATE_CONNECTOR_ORGANIZATION_ID`
- `PRIVATE_CONNECTOR_ENVIRONMENT`
- `PRIVATE_CONNECTOR_ID`
- `PRIVATE_CONNECTOR_MODE=cluster|byok_api`
- `PRIVATE_CONNECTOR_FORWARD_BASE_URL`
- `PRIVATE_CONNECTOR_ORG_API_KEY`
- `PRIVATE_CONNECTOR_UPSTREAM_API_KEY` only for `byok_api`

On startup, the runtime posts periodic private connector check-ins every `30s` by default and exposes `POST /v1/private-connectors/chat/completions`.

## Embeddings demo

After seeding, run the emitted embeddings curl command or use this form:

```bash
curl -sS \
  -H "Authorization: Bearer <buyer_api_key>" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3100/v1/embeddings \
  -d '{"model":"cheap-embed-v1","input":["hello world","provider marketplace"]}'
```

The request uses the same gateway auth, placement, workload-signing, runtime-admission, and metering path as chat completions.

## Batch demo

The control-plane also supports OpenAI-style files and batches for `/v1/chat/completions` and `/v1/embeddings`.

1. Write a JSONL batch input file:

```bash
cat >/tmp/compushare-batch-input.jsonl <<'EOF'
{"custom_id":"embed-1","method":"POST","url":"/v1/embeddings","body":{"model":"cheap-embed-v1","input":"hello world"}}
{"custom_id":"chat-1","method":"POST","url":"/v1/chat/completions","body":{"model":"openai/gpt-oss-120b-like","messages":[{"role":"user","content":"Summarize warm-cache routing."}]}}
EOF
```

2. Upload the input file:

```bash
curl -sS \
  -H "Authorization: Bearer <buyer_api_key>" \
  -F "purpose=batch" \
  -F "file=@/tmp/compushare-batch-input.jsonl;type=application/jsonl" \
  -X POST http://127.0.0.1:3100/v1/files
```

3. Create the batch with the returned `input_file_id`:

```bash
curl -sS \
  -H "Authorization: Bearer <buyer_api_key>" \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3100/v1/batches \
  -d '{"input_file_id":"<uploaded_file_id>","endpoint":"/v1/embeddings","completion_window":"24h"}'
```

4. Poll the batch:

```bash
curl -sS \
  -H "Authorization: Bearer <buyer_api_key>" \
  -X GET http://127.0.0.1:3100/v1/batches/<batch_id>
```

5. Download the generated output or error file contents:

```bash
curl -sS \
  -H "Authorization: Bearer <buyer_api_key>" \
  -X GET http://127.0.0.1:3100/v1/files/<output_or_error_file_id>/content
```

## Warm-cache routing demo

The control-plane now supports provider-declared warm model state as soft routing metadata. Warm state is capped at `15 minutes` from declaration time and only influences scored placement when the requested `approvedModelAlias` matches.

1. Refresh a provider node's warm model state:

```bash
curl -X PUT \
  -H "x-api-key: <provider_api_key>" \
  -H "Content-Type: application/json" \
  http://127.0.0.1:3100/v1/organizations/<provider_org_id>/environments/development/provider-nodes/<provider_node_id>/routing-state \
  -d '{"warmModelAliases":[{"approvedModelAlias":"openai/gpt-oss-120b-like","expiresAt":"2026-03-10T10:10:00.000Z"}]}'
```

2. Preview scored placement candidates for that model alias:

```bash
curl -X POST \
  -H "x-api-key: <buyer_api_key>" \
  -H "Content-Type: application/json" \
  http://127.0.0.1:3100/v1/organizations/<buyer_org_id>/environments/development/placement-candidates/preview \
  -d '{"gpuClass":"NVIDIA A100","minVramGb":80,"region":"eu-central-1","minimumTrustTier":"t1_vetted","maxPriceUsdPerHour":10,"approvedModelAlias":"openai/gpt-oss-120b-like"}'
```

The preview response includes additive `score`, `scoreBreakdown`, and `warmCache` fields so local routing decisions are inspectable.

## Provider node attestation demo

The control-plane also exposes a local TPM-style attestation loop for Linux provider nodes. Use the provider organization's API key from `pnpm seed:demo`, then:

1. Issue a challenge:

```bash
curl -X POST \
  -H "x-api-key: <provider_api_key>" \
  http://127.0.0.1:3100/v1/organizations/<provider_org_id>/environments/development/provider-nodes/<provider_node_id>/attestation-challenges
```

2. Submit attestation evidence for that challenge with a signed `tpm_quote_v1` payload.

On success, provider inventory/detail endpoints surface `attestationStatus`, `lastAttestedAt`, `attestationExpiresAt`, `attestationType`, and `effectiveTrustTier`, and placement requests that require `minimumTrustTier=t2_attested` will only match freshly attested Linux nodes.

## Stripe Connect sandbox payout demo

The control-plane now includes Stripe Connect Express onboarding, provider payout readiness APIs, a Stripe webhook endpoint, and a finance payout-run CLI. Local implementation and automated coverage are green. Live external validation still requires your own Stripe sandbox credentials and prefunded test balance.

### Required control-plane env vars

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_RETURN_URL_BASE`
- `STRIPE_CONNECT_REFRESH_URL_BASE`

### Provider onboarding and status

Issue or resume onboarding for a provider finance user:

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:3100/v1/organizations/<provider_org_id>/finance/provider-payout-accounts/onboarding-links \
  -d '{"actorUserId":"<provider_finance_user_id>"}'
```

Read the current payout account status:

```bash
curl -sS \
  "http://127.0.0.1:3100/v1/organizations/<provider_org_id>/finance/provider-payout-accounts/current?actorUserId=<provider_finance_user_id>"
```

Read provider payout availability:

```bash
curl -sS \
  "http://127.0.0.1:3100/v1/organizations/<provider_org_id>/finance/provider-payout-availability?actorUserId=<provider_finance_user_id>"
```

The existing staged payout export remains an internal finance handoff view. Stripe payout execution uses the provider-org payout availability read model instead.

### Local webhook forwarding

Authenticate the Stripe CLI first with `stripe login`, or pass `--api-key "$STRIPE_SECRET_KEY"` to the listen command. Forward Connect sandbox events to the control-plane:

```bash
stripe listen --forward-connect-to http://127.0.0.1:3100/v1/webhooks/stripe/connect
```

Copy the emitted signing secret into `STRIPE_WEBHOOK_SECRET`, then restart the control-plane if it was already running.

### Run the payout CLI

Dry run:

```bash
pnpm finance:payout:run --environment=development
```

Execute a real sandbox payout run:

```bash
pnpm finance:payout:run --environment=development --dry-run=false
```

Limit a run to one provider organization:

```bash
pnpm finance:payout:run --environment=development --provider-organization-id=<provider_org_id> --dry-run=false
```

### Sandbox prerequisites

- A valid Stripe test secret key
- A Stripe webhook secret from `stripe listen --forward-connect-to ...`
- A provider organization with completed Express onboarding
- A prefunded Stripe sandbox platform balance
- Positive provider-org `eligiblePayoutUsd`

### Minimum local acceptance flow

1. Start Postgres, control-plane, provider runtime, and dashboard.
2. Run `pnpm seed:demo`.
3. Create or resume provider payout onboarding and complete Stripe Express sandbox onboarding.
4. Start `stripe listen --forward-connect-to http://127.0.0.1:3100/v1/webhooks/stripe/connect`.
5. Run `pnpm finance:payout:run --environment=development --dry-run=false`.
6. Verify `account.updated` and `payout.*` events reconcile through `/v1/webhooks/stripe/connect`.

## Fraud review demo

The control-plane now exposes an org-scoped fraud review scan that inspects settlement, metering, and shared-member counterparty edges for explainable risk alerts.

```bash
curl -sS \
  "http://127.0.0.1:3100/v1/organizations/<organization_id>/risk/fraud-review-alerts?actorUserId=<finance_user_id>&lookbackDays=30"
```

The response returns deterministic alerts for `self_settlement`, `shared_member_settlement`, `settlement_without_usage`, and `counterparty_concentration`, plus a graph summary for the scanned window.

## Provider pricing simulator demo

The provider dashboard now includes a dedicated pricing what-if route. After `pnpm seed:demo`, open the emitted pricing URL or use this form:

```text
http://127.0.0.1:3000/provider/pricing?organizationId=<provider_org_id>&actorUserId=<provider_finance_user_id>
```

The page reads authoritative baselines from:

- `GET /v1/organizations/:organizationId/dashboard/provider-pricing-simulator?actorUserId=...`
- routing price floors
- latest provider benchmarks
- 7-day metered token usage
- 30-day realized settlement economics

Scenario edits stay local in the browser. No dashboard action writes pricing changes back to the control-plane.

## Provider dispute workflow demo

The platform now exposes a buyer-finance dispute workflow plus a provider-facing read-only dispute ledger view.

Dashboard URLs:

```text
http://127.0.0.1:3000/consumer/disputes?organizationId=<buyer_org_id>&actorUserId=<buyer_finance_user_id>
http://127.0.0.1:3000/provider/disputes?organizationId=<provider_org_id>&actorUserId=<provider_finance_user_id>
```

Finance and webhook APIs:

- `POST /v1/organizations/:organizationId/finance/provider-disputes`
- `GET /v1/organizations/:organizationId/finance/provider-disputes?actorUserId=...&status=...`
- `POST /v1/organizations/:organizationId/finance/provider-disputes/:disputeId/allocations`
- `POST /v1/organizations/:organizationId/finance/provider-disputes/:disputeId/status`
- `POST /v1/webhooks/stripe/disputes`

Manual settlement dispute example:

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -X POST "http://127.0.0.1:3100/v1/organizations/<buyer_org_id>/finance/provider-disputes" \
  -d '{
    "actorUserId": "<buyer_finance_user_id>",
    "disputeType": "settlement",
    "providerOrganizationId": "<provider_org_id>",
    "jobReference": "job_0001",
    "disputedAmountUsd": "4.00",
    "reasonCode": "quality_miss",
    "summary": "Provider missed the agreed latency and quality threshold.",
    "evidenceEntries": [
      { "label": "log_excerpt", "value": "p95 latency exceeded the SLA window" }
    ]
  }'
```

Manual chargeback allocation example:

```bash
curl -sS \
  -H "Content-Type: application/json" \
  -X POST "http://127.0.0.1:3100/v1/organizations/<buyer_org_id>/finance/provider-disputes/<dispute_id>/allocations" \
  -d '{
    "actorUserId": "<buyer_finance_user_id>",
    "allocations": [
      { "providerOrganizationId": "<provider_org_id>", "amountUsd": "2.50" }
    ]
  }'
```

`GET /v1/organizations/:organizationId/finance/provider-payout-availability` now reports `activeDisputeHoldUsd` alongside `eligiblePayoutUsd`, and placement logs include `lostDisputeCount90d` with `disputePenaltyMultiplier`.

## Compliance transparency and DPA export demo

The dashboard now includes:

- a public transparency page at `/subprocessors`
- a buyer compliance overview at `/consumer/compliance?organizationId=...&actorUserId=...&environment=...`
- a markdown DPA export route at `GET /v1/organizations/:organizationId/compliance/dpa-export?actorUserId=...&environment=...`

After `pnpm seed:demo`, open the emitted public and buyer compliance URLs or use these forms:

```text
http://127.0.0.1:3000/subprocessors
http://127.0.0.1:3000/consumer/compliance?organizationId=<buyer_org_id>&actorUserId=<buyer_finance_user_id>&environment=development
```

The public page lists repo-tracked platform subprocessors. The buyer page shows the platform appendix plus currently routable provider subprocessors for the chosen environment and links directly to the markdown export route.

Direct export example:

```bash
curl -sS \
  "http://127.0.0.1:3100/v1/organizations/<buyer_org_id>/compliance/dpa-export?actorUserId=<buyer_finance_user_id>&environment=development"
```

## Local quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Reset local data

```bash
pnpm dev:infra:down
docker volume rm compushare_compushare-postgres-data
```
