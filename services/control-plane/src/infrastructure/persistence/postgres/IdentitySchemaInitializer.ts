import type { Pool } from "pg";

export class IdentitySchemaInitializer {
  public constructor(private readonly pool: Pick<Pool, "query">) {}

  public async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        account_capabilities TEXT[] NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS organization_members (
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        joined_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (organization_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS organization_invitations (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        invitee_email TEXT NOT NULL,
        role TEXT NOT NULL,
        invited_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ NULL,
        accepted_by_user_id UUID NULL REFERENCES users (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS organization_api_keys (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        environment TEXT NOT NULL,
        secret_hash TEXT NOT NULL UNIQUE,
        secret_prefix TEXT NOT NULL,
        issued_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ NULL
      );

      CREATE TABLE IF NOT EXISTS ledger_transactions (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        transaction_type TEXT NOT NULL,
        reference TEXT NOT NULL,
        created_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        occurred_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ledger_postings (
        transaction_id UUID NOT NULL REFERENCES ledger_transactions (id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        organization_id UUID NULL REFERENCES organizations (id) ON DELETE CASCADE,
        account_code TEXT NOT NULL,
        direction TEXT NOT NULL,
        amount_cents BIGINT NOT NULL,
        PRIMARY KEY (transaction_id, ordinal)
      );

      CREATE INDEX IF NOT EXISTS ledger_postings_organization_account_idx
      ON ledger_postings (organization_id, account_code);

      CREATE SEQUENCE IF NOT EXISTS provider_nodes_enrollment_sequence_seq;

      CREATE TABLE IF NOT EXISTS provider_nodes (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        machine_id TEXT NOT NULL,
        label TEXT NOT NULL,
        runtime TEXT NOT NULL,
        region TEXT NOT NULL,
        hostname TEXT NOT NULL,
        trust_tier TEXT NOT NULL,
        health_state TEXT NOT NULL,
        driver_version TEXT NOT NULL,
        enrolled_at TIMESTAMPTZ NOT NULL,
        enrollment_sequence BIGINT NOT NULL DEFAULT nextval('provider_nodes_enrollment_sequence_seq'),
        UNIQUE (organization_id, machine_id)
      );

      ALTER TABLE provider_nodes
      ADD COLUMN IF NOT EXISTS enrollment_sequence BIGINT
      DEFAULT nextval('provider_nodes_enrollment_sequence_seq');

      UPDATE provider_nodes
      SET enrollment_sequence = nextval('provider_nodes_enrollment_sequence_seq')
      WHERE enrollment_sequence IS NULL;

      ALTER TABLE provider_nodes
      ALTER COLUMN enrollment_sequence SET DEFAULT nextval('provider_nodes_enrollment_sequence_seq');

      ALTER TABLE provider_nodes
      ALTER COLUMN enrollment_sequence SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS provider_nodes_enrollment_sequence_idx
      ON provider_nodes (enrollment_sequence);

      CREATE TABLE IF NOT EXISTS provider_node_gpus (
        provider_node_id UUID NOT NULL REFERENCES provider_nodes (id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        model TEXT NOT NULL,
        vram_gb INTEGER NOT NULL,
        gpu_count INTEGER NOT NULL,
        interconnect TEXT NULL,
        PRIMARY KEY (provider_node_id, ordinal)
      );

      CREATE TABLE IF NOT EXISTS provider_node_routing_profiles (
        provider_node_id UUID PRIMARY KEY REFERENCES provider_nodes (id) ON DELETE CASCADE,
        endpoint_url TEXT NOT NULL,
        price_floor_usd_per_hour DOUBLE PRECISION NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE SEQUENCE IF NOT EXISTS provider_node_benchmarks_benchmark_sequence_seq;

      CREATE TABLE IF NOT EXISTS provider_node_benchmarks (
        id UUID PRIMARY KEY,
        provider_node_id UUID NOT NULL REFERENCES provider_nodes (id) ON DELETE CASCADE,
        gpu_class TEXT NOT NULL,
        vram_gb INTEGER NOT NULL,
        throughput_tokens_per_second DOUBLE PRECISION NOT NULL,
        driver_version TEXT NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL,
        benchmark_sequence BIGINT NOT NULL DEFAULT nextval('provider_node_benchmarks_benchmark_sequence_seq')
      );

      ALTER TABLE provider_node_benchmarks
      ADD COLUMN IF NOT EXISTS benchmark_sequence BIGINT
      DEFAULT nextval('provider_node_benchmarks_benchmark_sequence_seq');

      UPDATE provider_node_benchmarks
      SET benchmark_sequence = nextval('provider_node_benchmarks_benchmark_sequence_seq')
      WHERE benchmark_sequence IS NULL;

      ALTER TABLE provider_node_benchmarks
      ALTER COLUMN benchmark_sequence SET DEFAULT nextval('provider_node_benchmarks_benchmark_sequence_seq');

      ALTER TABLE provider_node_benchmarks
      ALTER COLUMN benchmark_sequence SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS provider_node_benchmarks_benchmark_sequence_idx
      ON provider_node_benchmarks (benchmark_sequence);

      CREATE TABLE IF NOT EXISTS placement_decision_logs (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        gpu_class TEXT NOT NULL,
        min_vram_gb INTEGER NOT NULL,
        region TEXT NOT NULL,
        minimum_trust_tier TEXT NOT NULL,
        max_price_usd_per_hour DOUBLE PRECISION NOT NULL,
        candidate_count INTEGER NOT NULL,
        selected_provider_node_id UUID NULL REFERENCES provider_nodes (id) ON DELETE SET NULL,
        selected_provider_organization_id UUID NULL REFERENCES organizations (id) ON DELETE SET NULL,
        rejection_reason TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gateway_usage_meter_events (
        workload_bundle_id UUID PRIMARY KEY,
        occurred_at TIMESTAMPTZ NOT NULL,
        customer_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        provider_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        provider_node_id UUID NOT NULL REFERENCES provider_nodes (id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        approved_model_alias TEXT NOT NULL,
        manifest_id TEXT NOT NULL,
        decision_log_id UUID NOT NULL REFERENCES placement_decision_logs (id) ON DELETE CASCADE,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS gateway_usage_meter_events_customer_occurred_idx
      ON gateway_usage_meter_events (customer_organization_id, occurred_at);

      CREATE INDEX IF NOT EXISTS gateway_usage_meter_events_provider_occurred_idx
      ON gateway_usage_meter_events (provider_organization_id, occurred_at);

      CREATE INDEX IF NOT EXISTS gateway_usage_meter_events_model_occurred_idx
      ON gateway_usage_meter_events (approved_model_alias, occurred_at);
    `);
  }
}
