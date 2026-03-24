import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { EmailAddress } from "../../../src/domain/identity/EmailAddress.js";
import { OrganizationId } from "../../../src/domain/identity/OrganizationId.js";
import { UserId } from "../../../src/domain/identity/UserId.js";
import { LedgerPosting } from "../../../src/domain/ledger/LedgerPosting.js";
import { LedgerTransaction } from "../../../src/domain/ledger/LedgerTransaction.js";
import { UsdAmount } from "../../../src/domain/ledger/UsdAmount.js";
import { ProviderNodeId } from "../../../src/domain/provider/ProviderNodeId.js";
import { IdentitySchemaInitializer } from "../../../src/infrastructure/persistence/postgres/IdentitySchemaInitializer.js";
import { PostgresIdentityRepository } from "../../../src/infrastructure/persistence/postgres/PostgresIdentityRepository.js";

interface PgMemModule {
  Pool: new () => Pool;
}

describe("PostgresIdentityRepository", () => {
  let pool: Pool;

  beforeAll(async () => {
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const pgAdapter = database.adapters.createPg() as unknown as PgMemModule;
    pool = new pgAdapter.Pool();

    const schemaInitializer = new IdentitySchemaInitializer(pool);
    await schemaInitializer.ensureSchema();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("returns null or false for missing identity records", async () => {
    const repository = new PostgresIdentityRepository(pool);

    await expect(
      repository.findUserByEmail(EmailAddress.create("missing@example.com"))
    ).resolves.toBeNull();
    await expect(
      repository.findOrganizationMember(
        OrganizationId.create("7cf765ce-0682-4866-9cb2-74848f2f6b3d"),
        UserId.create("8044d77c-afdd-4600-aaed-2b2b031b9c65")
      )
    ).resolves.toBeNull();
    await expect(
      repository.pendingInvitationExists(
        OrganizationId.create("7cf765ce-0682-4866-9cb2-74848f2f6b3d"),
        EmailAddress.create("missing@example.com")
      )
    ).resolves.toBe(false);
    await expect(
      repository.findPendingInvitationByTokenHash(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      )
    ).resolves.toBeNull();
    await expect(
      repository.findOrganizationApiKeyBySecretHash(
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      )
    ).resolves.toBeNull();
  });

  it("returns the last inserted benchmark when recorded_at timestamps tie", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const organizationId = "5c0f8af8-3528-4c23-a4ab-e9f4ef1e85a1";
    const providerNodeId = "ac33ebda-5c53-46b0-b96d-541d7fb2ac2c";

    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        organizationId,
        "Repository Provider Org",
        "repository-provider-org",
        ["provider"],
        new Date("2026-03-09T18:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id,
          organization_id,
          machine_id,
          label,
          runtime,
          region,
          hostname,
          trust_tier,
          health_state,
          driver_version,
          enrolled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        providerNodeId,
        organizationId,
        "repository-node-0001",
        "Repository Primary Node",
        "linux",
        "eu-central-1",
        "repository-node-01.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-09T18:10:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_gpus (
          provider_node_id,
          ordinal,
          model,
          vram_gb,
          gpu_count,
          interconnect
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [providerNodeId, 0, "NVIDIA A100", 80, 4, "nvlink"]
    );

    await pool.query(
      `
        INSERT INTO provider_node_benchmarks (
          id,
          provider_node_id,
          gpu_class,
          vram_gb,
          throughput_tokens_per_second,
          driver_version,
          recorded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        "f6bdc11a-9314-43e1-88f4-e25387d5c8a3",
        providerNodeId,
        "NVIDIA A100",
        80,
        701.2,
        "550.54.14",
        new Date("2026-03-09T19:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_benchmarks (
          id,
          provider_node_id,
          gpu_class,
          vram_gb,
          throughput_tokens_per_second,
          driver_version,
          recorded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        "942a8879-6f88-4264-b527-53245ccbd333",
        providerNodeId,
        "NVIDIA A100",
        80,
        742.5,
        "550.54.14",
        new Date("2026-03-09T19:00:00.000Z")
      ]
    );

    const summaries = await repository.listProviderInventorySummaries(
      OrganizationId.create(organizationId)
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.toSnapshot()).toMatchObject({
      latestBenchmark: {
        throughputTokensPerSecond: 742.5
      }
    });
  });

  it("preserves node insertion order when enrolled_at timestamps tie", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const organizationId = "bb326a33-06b4-4ab5-857b-d99348306473";
    const firstProviderNodeId = "15c8bfe6-df18-4032-b43f-e58d622143b2";
    const secondProviderNodeId = "1b80acda-0e7f-4a5d-af36-7b9758d265e2";
    const enrolledAt = new Date("2026-03-10T18:10:00.000Z");

    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        organizationId,
        "Repository Provider Order Org",
        "repository-provider-order-org",
        ["provider"],
        new Date("2026-03-10T18:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id,
          organization_id,
          machine_id,
          label,
          runtime,
          region,
          hostname,
          trust_tier,
          health_state,
          driver_version,
          enrolled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        firstProviderNodeId,
        organizationId,
        "repository-order-node-0001",
        "Repository Ordered Node One",
        "linux",
        "eu-central-1",
        "repository-order-node-01.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        enrolledAt
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id,
          organization_id,
          machine_id,
          label,
          runtime,
          region,
          hostname,
          trust_tier,
          health_state,
          driver_version,
          enrolled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        secondProviderNodeId,
        organizationId,
        "repository-order-node-0002",
        "Repository Ordered Node Two",
        "kubernetes",
        "us-east-1",
        "repository-order-node-02.internal",
        "t1_vetted",
        "healthy",
        "550.60.02",
        enrolledAt
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_gpus (
          provider_node_id,
          ordinal,
          model,
          vram_gb,
          gpu_count,
          interconnect
        )
        VALUES
          ($1, $2, $3, $4, $5, $6),
          ($7, $8, $9, $10, $11, $12)
      `,
      [
        firstProviderNodeId,
        0,
        "NVIDIA A100",
        80,
        4,
        "nvlink",
        secondProviderNodeId,
        0,
        "NVIDIA L40S",
        48,
        2,
        null
      ]
    );

    const summaries = await repository.listProviderInventorySummaries(
      OrganizationId.create(organizationId)
    );

    expect(summaries.map((summary) => summary.node.machineId.value)).toEqual([
      "repository-order-node-0001",
      "repository-order-node-0002"
    ]);
  });

  it("lists only routable provider subprocessors for the selected environment", async () => {
    const repository = new PostgresIdentityRepository(pool, () =>
      new Date("2026-03-10T12:00:00.000Z")
    );
    const issuerUserId = "345db7ff-1355-43c7-b333-6ae1e7246c3f";
    const developmentProviderId = "ad746813-b438-45cc-83fb-5f4e7797b670";
    const stagingOnlyProviderId = "a8bb43cc-72c0-4d1a-9daa-70216ff8686f";
    const developmentNodeId = "e00ddef9-9466-45dc-b9b9-dbd7c4f2a454";
    const stagingNodeId = "74ed695d-88c8-4f8e-98a7-3f52f35dd7ca";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        issuerUserId,
        "compliance-repository-owner@example.com",
        "Compliance Repository Owner",
        new Date("2026-03-10T08:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES
          ($1, $2, $3, $4, $5),
          ($6, $7, $8, $9, $10)
      `,
      [
        developmentProviderId,
        "Compliance Provider A",
        "compliance-provider-a",
        ["provider"],
        new Date("2026-03-10T08:00:00.000Z"),
        stagingOnlyProviderId,
        "Compliance Provider B",
        "compliance-provider-b",
        ["provider"],
        new Date("2026-03-10T08:05:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO organization_api_keys (
          id, organization_id, label, environment, secret_hash, secret_prefix, issued_by_user_id, created_at, last_used_at
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, NULL),
          ($9, $10, $11, $12, $13, $14, $15, $16, NULL)
      `,
      [
        "40f90d78-a873-4b61-9f5a-b25ecfb56887",
        developmentProviderId,
        "dev key",
        "development",
        "a".repeat(64),
        "csk_dev_1",
        issuerUserId,
        new Date("2026-03-10T08:10:00.000Z"),
        "9e902b70-5fd9-46eb-84ce-c198ac393ce1",
        stagingOnlyProviderId,
        "staging key",
        "staging",
        "b".repeat(64),
        "csk_staging_1",
        issuerUserId,
        new Date("2026-03-10T08:11:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id, organization_id, machine_id, label, runtime, region, hostname, trust_tier, health_state, driver_version, enrolled_at
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
          ($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `,
      [
        developmentNodeId,
        developmentProviderId,
        "compliance-node-a",
        "Compliance Node A",
        "linux",
        "eu-central-1",
        "provider-a.internal",
        "t2_attested",
        "healthy",
        "550.54.14",
        new Date("2026-03-10T08:20:00.000Z"),
        stagingNodeId,
        stagingOnlyProviderId,
        "compliance-node-b",
        "Compliance Node B",
        "linux",
        "us-east-1",
        "provider-b.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-10T08:21:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_routing_profiles (
          provider_node_id, endpoint_url, price_floor_usd_per_hour, updated_at
        )
        VALUES
          ($1, $2, $3, $4),
          ($5, $6, $7, $8)
      `,
      [
        developmentNodeId,
        "https://provider-a.example.com/v1/chat/completions",
        8.5,
        new Date("2026-03-10T08:30:00.000Z"),
        stagingNodeId,
        "https://provider-b.example.com/v1/chat/completions",
        9.5,
        new Date("2026-03-10T08:31:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_benchmarks (
          id, provider_node_id, gpu_class, vram_gb, throughput_tokens_per_second, driver_version, recorded_at
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7),
          ($8, $9, $10, $11, $12, $13, $14)
      `,
      [
        "16ab6890-0ebd-4ed1-a6ce-a0a8866e9f6c",
        developmentNodeId,
        "NVIDIA A100",
        80,
        700,
        "550.54.14",
        new Date("2026-03-10T08:40:00.000Z"),
        "79f6a091-2236-4a74-aa74-84a1a7e41bdb",
        stagingNodeId,
        "NVIDIA H100",
        80,
        900,
        "550.54.14",
        new Date("2026-03-10T08:41:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_attestation_challenges (
          id, provider_node_id, nonce, created_at, expires_at, used_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        "4b632744-2da4-4b9b-a1ab-d43daa752b2f",
        developmentNodeId,
        "challenge-nonce",
        new Date("2026-03-10T08:41:00.000Z"),
        new Date("2026-03-10T09:41:00.000Z"),
        new Date("2026-03-10T08:41:30.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_attestations (
          id, provider_node_id, challenge_id, attestation_type, attestation_public_key_fingerprint, quoted_at,
          secure_boot_enabled, pcr_values, verified, failure_reason, recorded_at, expires_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, '{}'::jsonb, $8, NULL, $9, $10
        )
      `,
      [
        "6805f6cf-8d47-4174-9f48-bb5e1ef912cb",
        developmentNodeId,
        "4b632744-2da4-4b9b-a1ab-d43daa752b2f",
        "tpm_quote_v1",
        "fingerprint-a",
        new Date("2026-03-10T08:42:00.000Z"),
        true,
        true,
        new Date("2026-03-10T08:43:00.000Z"),
        new Date("2026-03-11T08:43:00.000Z")
      ]
    );

    const developmentProviders = await repository.listRoutableProviderSubprocessors({
      environment: "development",
      now: new Date("2026-03-10T12:00:00.000Z")
    });

    expect(developmentProviders.map((entry) => entry.toSnapshot())).toMatchObject([
      {
        organizationId: developmentProviderId,
        organizationSlug: "compliance-provider-a",
        environment: "development",
        regions: ["eu-central-1"],
        trustTierCeiling: "t2_attested",
        hasActiveAttestation: true,
        routingAvailable: true,
        routableNodeCount: 1
      }
    ]);
  });

  it("returns benchmark history newest first when recorded_at timestamps tie", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const organizationId = "26f36276-ccda-4f0d-8b34-6225d9d4156e";
    const providerNodeId = "233839aa-abbb-40eb-92e0-c4450a197297";
    const recordedAt = new Date("2026-03-11T19:00:00.000Z");

    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        organizationId,
        "Repository Provider History Org",
        "repository-provider-history-org",
        ["provider"],
        new Date("2026-03-11T18:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id,
          organization_id,
          machine_id,
          label,
          runtime,
          region,
          hostname,
          trust_tier,
          health_state,
          driver_version,
          enrolled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        providerNodeId,
        organizationId,
        "repository-history-node-0001",
        "Repository History Node",
        "linux",
        "eu-central-1",
        "repository-history-node-01.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-11T18:10:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_benchmarks (
          id,
          provider_node_id,
          gpu_class,
          vram_gb,
          throughput_tokens_per_second,
          driver_version,
          recorded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        "77c834c1-a688-4f3f-b880-1dbf44933005",
        providerNodeId,
        "NVIDIA A100",
        80,
        701.2,
        "550.54.14",
        recordedAt
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_benchmarks (
          id,
          provider_node_id,
          gpu_class,
          vram_gb,
          throughput_tokens_per_second,
          driver_version,
          recorded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        "6fd65134-2644-4b64-98c3-c128f4baed39",
        providerNodeId,
        "NVIDIA A100",
        80,
        742.5,
        "550.54.14",
        recordedAt
      ]
    );

    const benchmarks = await repository.listProviderBenchmarkReports(
      OrganizationId.create(organizationId),
      ProviderNodeId.create(providerNodeId)
    );

    expect(
      benchmarks.map((benchmark) => benchmark.throughputTokensPerSecond.value)
    ).toEqual([742.5, 701.2]);
  });

  it("returns one provider inventory summary for a direct node detail lookup", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const organizationId = "ec516ca6-3c37-4d46-aa16-495d6555bcbc";
    const providerNodeId = "4c0df27f-c141-421f-abd0-c74db0ab7f85";

    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        organizationId,
        "Repository Provider Detail Org",
        "repository-provider-detail-org",
        ["provider"],
        new Date("2026-03-12T18:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id,
          organization_id,
          machine_id,
          label,
          runtime,
          region,
          hostname,
          trust_tier,
          health_state,
          driver_version,
          enrolled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        providerNodeId,
        organizationId,
        "repository-detail-node-0001",
        "Repository Detail Node",
        "linux",
        "eu-central-1",
        "repository-detail-node-01.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-12T18:10:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_node_gpus (
          provider_node_id,
          ordinal,
          model,
          vram_gb,
          gpu_count,
          interconnect
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [providerNodeId, 0, "NVIDIA A100", 80, 4, "nvlink"]
    );

    await pool.query(
      `
        INSERT INTO provider_node_benchmarks (
          id,
          provider_node_id,
          gpu_class,
          vram_gb,
          throughput_tokens_per_second,
          driver_version,
          recorded_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        "52629df9-a492-44ee-bd09-69620292e804",
        providerNodeId,
        "NVIDIA A100",
        80,
        742.5,
        "550.54.14",
        new Date("2026-03-12T19:00:00.000Z")
      ]
    );

    const summary = await repository.findProviderInventorySummary(
      OrganizationId.create(organizationId),
      ProviderNodeId.create(providerNodeId)
    );

    expect(summary?.toSnapshot()).toMatchObject({
      node: {
        id: providerNodeId,
        machineId: "repository-detail-node-0001"
      },
      latestBenchmark: {
        throughputTokensPerSecond: 742.5
      }
    });
  });

  it("persists balanced ledger transactions and derives explicit wallet balances", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const organizationId = "84eb9189-51af-4ffc-9ca3-23ffb2d801d7";
    const userId = "0e262d80-922a-4a00-b967-6697c4bb8298";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        userId,
        "ledger-owner@example.com",
        "Ledger Owner",
        new Date("2026-03-10T08:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        organizationId,
        "Repository Ledger Org",
        "repository-ledger-org",
        ["buyer", "provider"],
        new Date("2026-03-10T08:00:00.000Z")
      ]
    );

    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId,
        transactionType: "customer_charge",
        reference: "stripe_pi_repository_001",
        createdByUserId: userId,
        occurredAt: new Date("2026-03-10T09:00:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "platform_cash_clearing",
            direction: "debit",
            amount: UsdAmount.parse("25.00")
          }),
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "credit",
            amount: UsdAmount.parse("25.00"),
            organizationId
          })
        ]
      })
    );

    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId,
        transactionType: "job_settlement",
        reference: "job_0001",
        createdByUserId: userId,
        occurredAt: new Date("2026-03-10T10:00:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amount: UsdAmount.parse("10.00"),
            organizationId
          }),
          LedgerPosting.create({
            accountCode: "provider_payable",
            direction: "credit",
            amount: UsdAmount.parse("8.50"),
            organizationId
          }),
          LedgerPosting.create({
            accountCode: "platform_revenue",
            direction: "credit",
            amount: UsdAmount.parse("1.20")
          }),
          LedgerPosting.create({
            accountCode: "risk_reserve",
            direction: "credit",
            amount: UsdAmount.parse("0.30"),
            organizationId
          })
        ]
      })
    );

    await expect(
      repository.getOrganizationWalletSummary(
        OrganizationId.create(organizationId)
      )
    ).resolves.toMatchObject({
      usageBalance: {
        cents: 1500
      },
      spendCredits: {
        cents: 0
      },
      pendingEarnings: {
        cents: 850
      },
      withdrawableCash: {
        cents: 820
      }
    });

    await expect(
      repository.getStagedPayoutExport(OrganizationId.create(organizationId))
    ).resolves.toMatchObject({
      organizationId: {
        value: organizationId
      },
      entries: [
        expect.objectContaining({
          providerOrganizationId: {
            value: organizationId
          },
          settlementReference: "job_0001",
          providerPayable: {
            cents: 850
          },
          reserveHoldback: {
            cents: 30
          },
          withdrawableCash: {
            cents: 820
          }
        })
      ]
    });
  });

  it("returns staged payout export entries in deterministic occurred_at then reference order", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const buyerOrganizationId = "d95dca23-0fd1-405c-bab3-e540a46f7b68";
    const providerOrganizationId = "f68e37c1-00b8-406d-bc24-66ee8ae5b4e0";
    const userId = "2eaecc31-fb7e-4187-a9b8-86f2187e8918";
    const occurredAt = new Date("2026-03-10T14:00:00.000Z");

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        userId,
        "ledger-export-owner@example.com",
        "Ledger Export Owner",
        new Date("2026-03-10T13:00:00.000Z")
      ]
    );
    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)
      `,
      [
        buyerOrganizationId,
        "Repository Buyer Export Org",
        "repository-buyer-export-org",
        ["buyer"],
        new Date("2026-03-10T13:00:00.000Z"),
        providerOrganizationId,
        "Repository Provider Export Org",
        "repository-provider-export-org",
        ["provider"],
        new Date("2026-03-10T13:00:00.000Z")
      ]
    );

    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId: buyerOrganizationId,
        transactionType: "job_settlement",
        reference: "job_0002",
        createdByUserId: userId,
        occurredAt,
        postings: [
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amount: UsdAmount.parse("5.00"),
            organizationId: buyerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "provider_payable",
            direction: "credit",
            amount: UsdAmount.parse("4.00"),
            organizationId: providerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "platform_revenue",
            direction: "credit",
            amount: UsdAmount.parse("0.80")
          }),
          LedgerPosting.create({
            accountCode: "risk_reserve",
            direction: "credit",
            amount: UsdAmount.parse("0.20"),
            organizationId: providerOrganizationId
          })
        ]
      })
    );

    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId: buyerOrganizationId,
        transactionType: "job_settlement",
        reference: "job_0001",
        createdByUserId: userId,
        occurredAt,
        postings: [
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amount: UsdAmount.parse("10.00"),
            organizationId: buyerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "provider_payable",
            direction: "credit",
            amount: UsdAmount.parse("8.50"),
            organizationId: providerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "platform_revenue",
            direction: "credit",
            amount: UsdAmount.parse("1.20")
          }),
          LedgerPosting.create({
            accountCode: "risk_reserve",
            direction: "credit",
            amount: UsdAmount.parse("0.30"),
            organizationId: providerOrganizationId
          })
        ]
      })
    );

    await expect(
      repository.getStagedPayoutExport(
        OrganizationId.create(buyerOrganizationId)
      )
    ).resolves.toMatchObject({
      entries: [
        expect.objectContaining({
          settlementReference: "job_0001",
          providerPayable: { cents: 850 },
          reserveHoldback: { cents: 30 },
          withdrawableCash: { cents: 820 }
        }),
        expect.objectContaining({
          settlementReference: "job_0002",
          providerPayable: { cents: 400 },
          reserveHoldback: { cents: 20 },
          withdrawableCash: { cents: 380 }
        })
      ]
    });
  });

  it("builds fraud graph counterparty exposures from settlements, usage, and shared members", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const buyerOrganizationId = "a1d1f922-437f-4f5d-b3f1-3bb3c3a8b8d1";
    const providerOrganizationId = "f52ce3cf-29d1-4d6f-9cf2-7d26374ec0d6";
    const sharedUserId = "1e83a2a1-dc9b-4c64-96f6-bab5735f8e2a";
    const financeUserId = "128893d7-1874-457b-b74f-78a93d871c8f";
    const providerNodeId = "1d574e8e-a815-43d5-a7d4-e3e6e467dc81";
    const decisionLogId = "4fef6fbe-28b4-42df-8d42-221d8d702775";

    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES
          ($1, $2, $3, $4, $5),
          ($6, $7, $8, $9, $10)
      `,
      [
        buyerOrganizationId,
        "Fraud Buyer",
        "fraud-buyer",
        ["buyer"],
        new Date("2026-03-01T09:00:00.000Z"),
        providerOrganizationId,
        "Fraud Provider",
        "fraud-provider",
        ["provider"],
        new Date("2026-03-01T09:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES
          ($1, $2, $3, $4),
          ($5, $6, $7, $8)
      `,
      [
        sharedUserId,
        "shared@example.com",
        "Shared Identity",
        new Date("2026-03-01T09:00:00.000Z"),
        financeUserId,
        "finance@example.com",
        "Finance User",
        new Date("2026-03-01T09:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO organization_members (organization_id, user_id, role, joined_at)
        VALUES
          ($1, $2, $3, $4),
          ($5, $2, $6, $7),
          ($1, $8, $9, $10)
      `,
      [
        buyerOrganizationId,
        sharedUserId,
        "owner",
        new Date("2026-03-01T09:00:00.000Z"),
        providerOrganizationId,
        "owner",
        new Date("2026-03-01T09:00:00.000Z"),
        financeUserId,
        "finance",
        new Date("2026-03-01T09:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id,
          organization_id,
          machine_id,
          label,
          runtime,
          region,
          hostname,
          trust_tier,
          health_state,
          driver_version,
          enrolled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        providerNodeId,
        providerOrganizationId,
        "fraud-provider-node",
        "Fraud Provider Node",
        "linux",
        "eu-central-1",
        "fraud-provider.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-02T09:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO placement_decision_logs (
          id,
          organization_id,
          environment,
          gpu_class,
          min_vram_gb,
          region,
          minimum_trust_tier,
          max_price_usd_per_hour,
          approved_model_alias,
          candidate_count,
          selected_provider_node_id,
          selected_provider_organization_id,
          selection_score,
          price_performance_score,
          warm_cache_matched,
          rejection_reason,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
      [
        decisionLogId,
        buyerOrganizationId,
        "development",
        "nvidia a100",
        80,
        "eu-central-1",
        "t1_vetted",
        10,
        "openai/gpt-oss-120b-like",
        1,
        providerNodeId,
        providerOrganizationId,
        90,
        80,
        false,
        null,
        new Date("2026-03-08T10:00:00.000Z")
      ]
    );

    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId: buyerOrganizationId,
        transactionType: "job_settlement",
        reference: "fraud-job-1",
        createdByUserId: financeUserId,
        occurredAt: new Date("2026-03-08T10:00:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amount: UsdAmount.parse("12.00"),
            organizationId: buyerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "provider_payable",
            direction: "credit",
            amount: UsdAmount.parse("10.00"),
            organizationId: providerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "platform_revenue",
            direction: "credit",
            amount: UsdAmount.parse("1.50")
          }),
          LedgerPosting.create({
            accountCode: "risk_reserve",
            direction: "credit",
            amount: UsdAmount.parse("0.50"),
            organizationId: providerOrganizationId
          })
        ]
      })
    );

    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId: buyerOrganizationId,
        transactionType: "job_settlement",
        reference: "fraud-job-2",
        createdByUserId: financeUserId,
        occurredAt: new Date("2026-03-09T10:00:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amount: UsdAmount.parse("18.00"),
            organizationId: buyerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "provider_payable",
            direction: "credit",
            amount: UsdAmount.parse("15.00"),
            organizationId: providerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "platform_revenue",
            direction: "credit",
            amount: UsdAmount.parse("2.00")
          }),
          LedgerPosting.create({
            accountCode: "risk_reserve",
            direction: "credit",
            amount: UsdAmount.parse("1.00"),
            organizationId: providerOrganizationId
          })
        ]
      })
    );

    await pool.query(
      `
        INSERT INTO gateway_usage_meter_events (
          workload_bundle_id,
          occurred_at,
          customer_organization_id,
          provider_organization_id,
          provider_node_id,
          environment,
          request_kind,
          approved_model_alias,
          manifest_id,
          decision_log_id,
          batch_id,
          batch_item_id,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          latency_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        "1643dad4-46f9-4db1-97a4-ac423b449d4e",
        new Date("2026-03-09T10:30:00.000Z"),
        buyerOrganizationId,
        providerOrganizationId,
        providerNodeId,
        "development",
        "chat.completions",
        "openai/gpt-oss-120b-like",
        "chat-gpt-oss-120b-like-v1",
        decisionLogId,
        null,
        null,
        1200,
        1800,
        3000,
        240
      ]
    );

    await expect(
      repository.listFraudGraphCounterpartyExposures({
        organizationId: OrganizationId.create(buyerOrganizationId),
        startDateInclusive: new Date("2026-03-01T00:00:00.000Z"),
        endDateExclusive: new Date("2026-03-10T00:00:00.000Z")
      })
    ).resolves.toEqual([
      expect.objectContaining({
        counterpartyOrganizationId: OrganizationId.create(providerOrganizationId),
        sharedMemberEmails: ["shared@example.com"],
        outgoingSettlementCount: 2,
        outgoingSettled: UsdAmount.parse("25.00"),
        outgoingUsageEventCount: 1,
        outgoingUsageTotalTokens: 3000,
        incomingSettlementCount: 0,
        incomingSettled: UsdAmount.parse("0.00")
      })
    ]);
  });

  it("aggregates provider node usage totals and settlement economics for pricing simulation", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const providerOrganizationId = "618811f2-0de1-49d0-b0cb-ee08862ec0ed";
    const buyerOrganizationId = "4fe43c93-3381-44d5-9ef3-95a64081470a";
    const financeUserId = "b57142be-7c8d-4618-9062-74595aab5347";
    const firstNodeId = "e3aad1a7-84d8-43af-a64d-23995d1f5da8";
    const secondNodeId = "ae81187d-0d91-4daa-84ed-3ac047091937";
    const decisionLogId = "ec319b14-0f61-4ecf-8ae3-6baab5dfe4fb";

    await pool.query(
      `
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        financeUserId,
        "pricing-finance@example.com",
        "Pricing Finance",
        new Date("2026-03-10T08:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO organizations (id, name, slug, account_capabilities, created_at)
        VALUES ($1, $2, $3, $4, $5),
               ($6, $7, $8, $9, $10)
      `,
      [
        providerOrganizationId,
        "Pricing Provider Org",
        "pricing-provider-org",
        ["provider"],
        new Date("2026-03-10T08:00:00.000Z"),
        buyerOrganizationId,
        "Pricing Buyer Org",
        "pricing-buyer-org",
        ["buyer"],
        new Date("2026-03-10T08:00:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO provider_nodes (
          id,
          organization_id,
          machine_id,
          label,
          runtime,
          region,
          hostname,
          trust_tier,
          health_state,
          driver_version,
          enrolled_at
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
          ($12, $2, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `,
      [
        firstNodeId,
        providerOrganizationId,
        "pricing-node-0001",
        "Pricing Node One",
        "linux",
        "eu-central-1",
        "pricing-node-01.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-10T08:10:00.000Z"),
        secondNodeId,
        "pricing-node-0002",
        "Pricing Node Two",
        "linux",
        "us-east-1",
        "pricing-node-02.internal",
        "t1_vetted",
        "healthy",
        "550.54.14",
        new Date("2026-03-10T08:11:00.000Z")
      ]
    );

    await repository.appendLedgerTransaction(
      LedgerTransaction.record({
        organizationId: buyerOrganizationId,
        transactionType: "job_settlement",
        reference: "pricing-job-1",
        createdByUserId: financeUserId,
        occurredAt: new Date("2026-03-09T10:00:00.000Z"),
        postings: [
          LedgerPosting.create({
            accountCode: "customer_prepaid_cash_liability",
            direction: "debit",
            amount: UsdAmount.parse("50.00"),
            organizationId: buyerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "provider_payable",
            direction: "credit",
            amount: UsdAmount.parse("42.00"),
            organizationId: providerOrganizationId
          }),
          LedgerPosting.create({
            accountCode: "platform_revenue",
            direction: "credit",
            amount: UsdAmount.parse("6.00")
          }),
          LedgerPosting.create({
            accountCode: "risk_reserve",
            direction: "credit",
            amount: UsdAmount.parse("2.00"),
            organizationId: providerOrganizationId
          })
        ]
      })
    );

    await pool.query(
      `
        INSERT INTO placement_decision_logs (
          id,
          organization_id,
          environment,
          gpu_class,
          min_vram_gb,
          region,
          minimum_trust_tier,
          max_price_usd_per_hour,
          approved_model_alias,
          candidate_count,
          selected_provider_node_id,
          selected_provider_organization_id,
          selection_score,
          price_performance_score,
          warm_cache_matched,
          rejection_reason,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
      `,
      [
        decisionLogId,
        buyerOrganizationId,
        "development",
        "NVIDIA A100",
        80,
        "eu-central-1",
        "t1_vetted",
        10,
        "openai/gpt-oss-120b-like",
        2,
        firstNodeId,
        providerOrganizationId,
        92.5,
        80.1,
        false,
        null,
        new Date("2026-03-09T10:15:00.000Z")
      ]
    );

    await pool.query(
      `
        INSERT INTO gateway_usage_meter_events (
          workload_bundle_id,
          occurred_at,
          customer_organization_id,
          provider_organization_id,
          provider_node_id,
          environment,
          request_kind,
          approved_model_alias,
          manifest_id,
          decision_log_id,
          batch_id,
          batch_item_id,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          latency_ms
        )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16),
          ($17, $18, $3, $4, $19, $6, $7, $8, $9, $10, $11, $12, $20, $21, $22, $23)
      `,
      [
        "7369647a-c39d-4e5d-8b83-3bf2a813e1ec",
        new Date("2026-03-09T10:30:00.000Z"),
        buyerOrganizationId,
        providerOrganizationId,
        firstNodeId,
        "development",
        "chat.completions",
        "openai/gpt-oss-120b-like",
        "chat-gpt-oss-120b-like-v1",
        decisionLogId,
        null,
        null,
        1200,
        1800,
        3000,
        240,
        "5340c330-3ef3-403b-af0f-88c0b5d9a00b",
        new Date("2026-03-09T12:30:00.000Z"),
        secondNodeId,
        800,
        1200,
        2000,
        210
      ]
    );

    await expect(
      repository.listProviderNodeUsageTotals({
        organizationId: OrganizationId.create(providerOrganizationId),
        startDateInclusive: new Date("2026-03-03T00:00:00.000Z"),
        endDateExclusive: new Date("2026-03-11T00:00:00.000Z")
      })
    ).resolves.toEqual([
      {
        providerNodeId: secondNodeId,
        totalTokens: 2000
      },
      {
        providerNodeId: firstNodeId,
        totalTokens: 3000
      }
    ]);

    await expect(
      repository.getProviderSettlementEconomics({
        organizationId: OrganizationId.create(providerOrganizationId),
        startDateInclusive: new Date("2026-02-09T00:00:00.000Z"),
        endDateExclusive: new Date("2026-03-11T00:00:00.000Z")
      })
    ).resolves.toEqual({
      settlementCount: 1,
      providerPayable: UsdAmount.parse("42.00"),
      platformRevenue: UsdAmount.parse("6.00"),
      reserveHoldback: UsdAmount.parse("2.00")
    });
  });
});
