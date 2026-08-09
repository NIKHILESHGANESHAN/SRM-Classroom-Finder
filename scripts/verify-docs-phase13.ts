/**
 * Phase 13 docs verification — schema.sql vs Prisma migration + ER coverage.
 * Run: npx tsx scripts/verify-docs-phase13.ts
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function load(rel: string): string {
  const p = path.join(ROOT, rel);
  assert(existsSync(p), `missing ${rel}`);
  return readFileSync(p, "utf8");
}

function mustInclude(hay: string, needles: string[], label: string) {
  for (const n of needles) {
    assert(hay.includes(n), `${label} missing “${n}”`);
  }
}

const migration = load(
  "prisma/migrations/20260809110000_init/migration.sql",
);
const schemaSql = load("docs/schema.sql");
const prisma = load("prisma/schema.prisma");
const erMmd = load("docs/ER-diagram.mmd");
const erDbml = load("docs/ER-diagram.dbml");
const readme = load("README.md");
const norm = load("docs/normalization-notes.md");
const report = load("docs/dbms-report-notes.md");
const license = load("LICENSE");

const tables = [
  "buildings",
  "floors",
  "time_slots",
  "classrooms",
  "free_reports",
  "occupied_reports",
] as const;

section("Required docs files");
for (const rel of [
  "docs/schema.sql",
  "docs/normalization-notes.md",
  "docs/ER-diagram.mmd",
  "docs/ER-diagram.dbml",
  "docs/dbms-report-notes.md",
  "docs/screenshots/README.md",
  "LICENSE",
]) {
  assert(existsSync(path.join(ROOT, rel)), `missing ${rel}`);
  console.log(`ok  ${rel}`);
}

section("schema.sql ↔ migration tables / enums / view");
mustInclude(schemaSql, [...tables], "schema.sql tables");
mustInclude(schemaSql, ["FreeReportStatus", "OccupiedReason"], "schema.sql enums");
mustInclude(schemaSql, ["active_free_classrooms"], "schema.sql view");
mustInclude(migration, [...tables, "active_free_classrooms"], "migration");
console.log("ok  tables, enums, view aligned");

section("schema.sql ↔ migration constraints / indexes");
const sharedArtifacts = [
  "floors_floor_number_positive",
  "time_slots_end_after_start",
  "classrooms_room_number_not_blank",
  "free_reports_confirmation_count_positive",
  "classrooms_floor_id_building_id_fkey",
  "free_reports_report_date_time_slot_id_status_idx",
  "occupied_reports_free_report_id_reporter_token_key",
  "free_reports_classroom_id_time_slot_id_report_date_key",
];
mustInclude(schemaSql, sharedArtifacts, "schema.sql");
mustInclude(migration, sharedArtifacts, "migration");
console.log(`ok  ${sharedArtifacts.length} shared DDL names present in both`);

section("Prisma models map to SQL tables");
mustInclude(prisma, [
  '@@map("buildings")',
  '@@map("floors")',
  '@@map("time_slots")',
  '@@map("classrooms")',
  '@@map("free_reports")',
  '@@map("occupied_reports")',
], "prisma @@map");
console.log("ok  Prisma @@map names match docs tables");

section("ER diagrams cover every table + cardinalities");
mustInclude(erMmd, [...tables], "ER-diagram.mmd");
mustInclude(erMmd, [
  "buildings ||--o{ floors",
  "buildings ||--o{ classrooms",
  "floors ||--o{ classrooms",
  "time_slots ||--o{ free_reports",
  "classrooms ||--o{ free_reports",
  "free_reports ||--o{ occupied_reports",
], "ER-diagram.mmd relationships");
mustInclude(erDbml, [...tables, "ref: >"], "ER-diagram.dbml");
console.log("ok  Mermaid + DBML cover tables and relationships");

section("README completeness");
mustInclude(readme, [
  "## Features",
  "## Tech stack",
  "## Folder structure",
  "## Local setup",
  "## Environment variables",
  "## Database setup",
  "Prisma migration steps",
  "Seed instructions",
  "## Running locally",
  "## Deployment",
  "## PWA support",
  "## Screenshots",
  "## DBMS Concepts Used",
  "## Future improvements",
  "## License",
  "DATABASE_URL",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
], "README");
console.log("ok  README sections present");

section("Narrative docs");
mustInclude(norm, ["1NF", "2NF", "3NF", "confidence", "anonymous", "redundancy"], "normalization");
mustInclude(report, [
  "Primary Keys",
  "Foreign Keys",
  "Composite Keys",
  "Candidate Keys",
  "Transactions",
  "Aggregate Queries",
  "Views",
  "Indexes",
  "Anonymous token",
  "scalable",
], "dbms-report-notes");
assert(license.includes("MIT License"), "LICENSE should be MIT");
console.log("ok  normalization + report notes + LICENSE");

console.log("\nPhase 13 docs verification passed.");

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}
