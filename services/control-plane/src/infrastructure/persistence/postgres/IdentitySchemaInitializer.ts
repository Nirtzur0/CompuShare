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

      CREATE TABLE IF NOT EXISTS provider_node_warm_model_states (
        provider_node_id UUID NOT NULL REFERENCES provider_nodes (id) ON DELETE CASCADE,
        approved_model_alias TEXT NOT NULL,
        declared_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (provider_node_id, approved_model_alias)
      );

      CREATE INDEX IF NOT EXISTS provider_node_warm_model_states_expiry_idx
      ON provider_node_warm_model_states (provider_node_id, expires_at DESC);

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

      CREATE TABLE IF NOT EXISTS provider_node_attestation_challenges (
        id UUID PRIMARY KEY,
        provider_node_id UUID NOT NULL REFERENCES provider_nodes (id) ON DELETE CASCADE,
        nonce TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS provider_node_attestation_challenges_node_created_idx
      ON provider_node_attestation_challenges (provider_node_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS provider_node_attestations (
        id UUID PRIMARY KEY,
        provider_node_id UUID NOT NULL REFERENCES provider_nodes (id) ON DELETE CASCADE,
        challenge_id UUID NOT NULL REFERENCES provider_node_attestation_challenges (id) ON DELETE CASCADE,
        attestation_type TEXT NOT NULL,
        attestation_public_key_fingerprint TEXT NOT NULL,
        quoted_at TIMESTAMPTZ NOT NULL,
        secure_boot_enabled BOOLEAN NOT NULL,
        pcr_values JSONB NOT NULL,
        verified BOOLEAN NOT NULL,
        failure_reason TEXT NULL,
        recorded_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS provider_node_attestations_node_recorded_idx
      ON provider_node_attestations (provider_node_id, recorded_at DESC);

      CREATE TABLE IF NOT EXISTS placement_decision_logs (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        gpu_class TEXT NOT NULL,
        min_vram_gb INTEGER NOT NULL,
        region TEXT NOT NULL,
        minimum_trust_tier TEXT NOT NULL,
        max_price_usd_per_hour DOUBLE PRECISION NOT NULL,
        approved_model_alias TEXT NULL,
        candidate_count INTEGER NOT NULL,
        selected_provider_node_id UUID NULL REFERENCES provider_nodes (id) ON DELETE SET NULL,
        selected_provider_organization_id UUID NULL REFERENCES organizations (id) ON DELETE SET NULL,
        selection_score DOUBLE PRECISION NULL,
        price_performance_score DOUBLE PRECISION NULL,
        warm_cache_matched BOOLEAN NULL,
        rejection_reason TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS private_connectors (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        label TEXT NOT NULL,
        mode TEXT NOT NULL,
        endpoint_url TEXT NOT NULL,
        runtime_version TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        last_check_in_at TIMESTAMPTZ NULL,
        last_ready_at TIMESTAMPTZ NULL,
        disabled_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS private_connectors_org_env_created_idx
      ON private_connectors (organization_id, environment, created_at DESC);

      CREATE TABLE IF NOT EXISTS private_connector_model_mappings (
        private_connector_id UUID NOT NULL REFERENCES private_connectors (id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        request_model_alias TEXT NOT NULL,
        upstream_model_id TEXT NOT NULL,
        PRIMARY KEY (private_connector_id, ordinal)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS private_connector_model_alias_idx
      ON private_connector_model_mappings (private_connector_id, request_model_alias);

      CREATE TABLE IF NOT EXISTS gateway_usage_meter_events (
        workload_bundle_id UUID PRIMARY KEY,
        occurred_at TIMESTAMPTZ NOT NULL,
        customer_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        execution_target_type TEXT NOT NULL DEFAULT 'marketplace_provider',
        provider_organization_id UUID NULL REFERENCES organizations (id) ON DELETE CASCADE,
        provider_node_id UUID NULL REFERENCES provider_nodes (id) ON DELETE CASCADE,
        private_connector_id UUID NULL REFERENCES private_connectors (id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        request_kind TEXT NOT NULL DEFAULT 'chat.completions',
        approved_model_alias TEXT NOT NULL,
        manifest_id TEXT NULL,
        decision_log_id UUID NULL REFERENCES placement_decision_logs (id) ON DELETE CASCADE,
        batch_id UUID NULL,
        batch_item_id TEXT NULL,
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

      ALTER TABLE gateway_usage_meter_events
      ADD COLUMN IF NOT EXISTS execution_target_type TEXT NOT NULL DEFAULT 'marketplace_provider';

      ALTER TABLE gateway_usage_meter_events
      ADD COLUMN IF NOT EXISTS private_connector_id UUID NULL REFERENCES private_connectors (id) ON DELETE CASCADE;

      ALTER TABLE gateway_usage_meter_events
      ALTER COLUMN provider_organization_id DROP NOT NULL;

      ALTER TABLE gateway_usage_meter_events
      ALTER COLUMN provider_node_id DROP NOT NULL;

      ALTER TABLE gateway_usage_meter_events
      ALTER COLUMN manifest_id DROP NOT NULL;

      ALTER TABLE gateway_usage_meter_events
      ALTER COLUMN decision_log_id DROP NOT NULL;

      CREATE TABLE IF NOT EXISTS gateway_files (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        purpose TEXT NOT NULL,
        filename TEXT NOT NULL,
        media_type TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS provider_payout_accounts (
        organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
        stripe_account_id TEXT NOT NULL UNIQUE,
        onboarding_status TEXT NOT NULL,
        charges_enabled BOOLEAN NOT NULL,
        payouts_enabled BOOLEAN NOT NULL,
        details_submitted BOOLEAN NOT NULL,
        country TEXT NOT NULL,
        default_currency TEXT NOT NULL,
        requirements_currently_due JSONB NOT NULL,
        requirements_eventually_due JSONB NOT NULL,
        last_stripe_sync_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS provider_payout_runs (
        id UUID PRIMARY KEY,
        environment TEXT NOT NULL,
        provider_organization_id_filter UUID NULL REFERENCES organizations (id) ON DELETE SET NULL,
        dry_run BOOLEAN NOT NULL,
        status TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ NULL
      );

      CREATE TABLE IF NOT EXISTS provider_payout_disbursements (
        id UUID PRIMARY KEY,
        payout_run_id UUID NOT NULL REFERENCES provider_payout_runs (id) ON DELETE CASCADE,
        provider_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        stripe_account_id TEXT NOT NULL,
        stripe_transfer_id TEXT NULL,
        stripe_payout_id TEXT NULL UNIQUE,
        idempotency_key TEXT NOT NULL UNIQUE,
        amount_cents BIGINT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        failure_code TEXT NULL,
        failure_message TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        paid_at TIMESTAMPTZ NULL,
        failed_at TIMESTAMPTZ NULL,
        canceled_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS provider_payout_disbursements_org_created_idx
      ON provider_payout_disbursements (provider_organization_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS stripe_webhook_receipts (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        received_at TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS gateway_files_org_created_idx
      ON gateway_files (organization_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS gateway_batch_jobs (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        environment TEXT NOT NULL,
        input_file_id UUID NOT NULL REFERENCES gateway_files (id) ON DELETE RESTRICT,
        output_file_id UUID NULL REFERENCES gateway_files (id) ON DELETE SET NULL,
        error_file_id UUID NULL REFERENCES gateway_files (id) ON DELETE SET NULL,
        endpoint TEXT NOT NULL,
        completion_window TEXT NOT NULL,
        status TEXT NOT NULL,
        created_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL,
        in_progress_at TIMESTAMPTZ NULL,
        completed_at TIMESTAMPTZ NULL,
        request_count_total INTEGER NOT NULL,
        request_count_completed INTEGER NOT NULL,
        request_count_failed INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS gateway_batch_jobs_status_created_idx
      ON gateway_batch_jobs (status, created_at ASC);

      CREATE TABLE IF NOT EXISTS gateway_batch_items (
        batch_id UUID NOT NULL REFERENCES gateway_batch_jobs (id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        custom_id TEXT NOT NULL,
        method TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        body JSONB NOT NULL,
        status TEXT NOT NULL,
        response_body JSONB NULL,
        error_body JSONB NULL,
        completed_at TIMESTAMPTZ NULL,
        PRIMARY KEY (batch_id, ordinal)
      );

      CREATE INDEX IF NOT EXISTS gateway_batch_items_status_idx
      ON gateway_batch_items (batch_id, status, ordinal ASC);
    `);
  }
}
