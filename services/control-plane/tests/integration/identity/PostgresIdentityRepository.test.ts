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
});
