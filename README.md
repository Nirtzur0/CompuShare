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

6. Seed demo data. The command prints JSON to stdout and a readable summary with ready-to-open dashboard URLs plus a gateway curl example:

```bash
pnpm seed:demo
```

7. Start the dashboard:

```bash
pnpm dev:dashboard
```

The dashboard runs on `http://127.0.0.1:3000` by default. The control-plane runs on `http://127.0.0.1:3100` by default. The local provider runtime runs on `http://127.0.0.1:3200` by default.

## End-to-end gateway demo

After seeding, run the emitted curl command against the control-plane gateway. The request will route to the local provider runtime, the provider runtime will call control-plane runtime admission with its scoped provider API key, and the mock completion response will come back through the real gateway path.

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
