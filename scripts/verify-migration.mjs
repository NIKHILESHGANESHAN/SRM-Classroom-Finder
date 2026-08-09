/**
 * One-off migration smoke test using embedded Postgres (no Docker required).
 * Run: node --experimental-vm-modules scripts/verify-migration.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, ".pg-verify-data");
const port = 55432;

async function main() {
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "srm",
    password: "srm",
    port,
    persistent: false,
  });

  console.log("Initialising embedded Postgres…");
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("srm_classroom_finder");

  const url = `postgresql://srm:srm@127.0.0.1:${port}/srm_classroom_finder`;
  console.log("Running prisma migrate deploy…");
  const migrate = spawnSync(
    "npx",
    ["prisma", "migrate", "deploy"],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: url },
      encoding: "utf8",
    },
  );
  process.stdout.write(migrate.stdout || "");
  process.stderr.write(migrate.stderr || "");
  if (migrate.status !== 0) {
    throw new Error(`migrate deploy failed with exit ${migrate.status}`);
  }

  const client = pg.getPgClient("srm_classroom_finder");
  await client.connect();

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const views = await client.query(`
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  const indexes = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'free_reports_report_date_time_slot_id_status_idx'
  `);
  const fks = await client.query(`
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'f'
    ORDER BY conname
  `);
  const checks = await client.query(`
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'c'
    ORDER BY conname
  `);

  console.log("\nTables:", tables.rows.map((r) => r.table_name).join(", "));
  console.log("Views:", views.rows.map((r) => r.table_name).join(", "));
  console.log("Spec index present:", indexes.rowCount === 1);
  console.log("Foreign keys:", fks.rowCount);
  console.log("Check constraints:", checks.rowCount);

  const expectedTables = [
    "buildings",
    "classrooms",
    "floors",
    "free_reports",
    "occupied_reports",
    "time_slots",
  ];
  const got = tables.rows.map((r) => r.table_name);
  for (const t of expectedTables) {
    if (!got.includes(t)) throw new Error(`Missing table: ${t}`);
  }
  if (!views.rows.some((r) => r.table_name === "active_free_classrooms")) {
    throw new Error("Missing view active_free_classrooms");
  }
  if (indexes.rowCount !== 1) {
    throw new Error("Missing free_reports(report_date, time_slot_id, status) index");
  }

  await client.end();
  await pg.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log("\nMigration verification PASSED.");
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});
