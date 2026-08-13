-- =============================================================================
-- SRM KTR Classroom Finder — Complete PostgreSQL DDL
-- Source of truth for coursework: mirrors prisma/migrations/.../migration.sql
-- and prisma/schema.prisma (Prisma does not express CHECKs or VIEWs in schema).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS "public";

-- -----------------------------------------------------------------------------
-- Enumerations
-- -----------------------------------------------------------------------------

CREATE TYPE "FreeReportStatus" AS ENUM (
  'unverified',
  'confirmed',
  'hidden',
  'expired'
);

CREATE TYPE "OccupiedReason" AS ENUM (
  'occupied',
  'class_in_progress',
  'wrong_info',
  'duplicate'
);

COMMENT ON TYPE "FreeReportStatus" IS
  'Lifecycle of a free-room claim. Expired/hidden rows are retained for Stats.';

COMMENT ON TYPE "OccupiedReason" IS
  'Reason a student flagged a free report as incorrect.';

-- -----------------------------------------------------------------------------
-- buildings — campus buildings (UB / TP1 / TP2 as rows, not enums)
-- PK: id | Candidate key: code
-- -----------------------------------------------------------------------------

CREATE TABLE "buildings" (
  "id"   TEXT NOT NULL,
  "code" VARCHAR(16) NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "buildings_code_key" ON "buildings" ("code");

COMMENT ON TABLE "buildings" IS
  'Campus building dimension. Adding a new building is one INSERT.';
COMMENT ON COLUMN "buildings"."code" IS 'Short UI code: UB | TP1 | TP2';

-- -----------------------------------------------------------------------------
-- floors — floors belonging to exactly one building
-- PK: id | Unique: (building_id, floor_number), (id, building_id)
-- FK: building_id → buildings(id)
-- -----------------------------------------------------------------------------

CREATE TABLE "floors" (
  "id"           TEXT NOT NULL,
  "building_id"  TEXT NOT NULL,
  "floor_number" INTEGER NOT NULL,
  CONSTRAINT "floors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "floors_floor_number_positive" CHECK ("floor_number" > 0)
);

CREATE INDEX "floors_building_id_idx" ON "floors" ("building_id");
CREATE UNIQUE INDEX "floors_building_id_floor_number_key"
  ON "floors" ("building_id", "floor_number");
-- Enables composite FK from classrooms so floor ∈ building
CREATE UNIQUE INDEX "floors_id_building_id_key"
  ON "floors" ("id", "building_id");

ALTER TABLE "floors"
  ADD CONSTRAINT "floors_building_id_fkey"
  FOREIGN KEY ("building_id") REFERENCES "buildings" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON TABLE "floors" IS
  'Per-building floor list. Different buildings have different floor ranges.';

-- -----------------------------------------------------------------------------
-- time_slots — official campus period boundaries
-- PK: id | Candidate key: slot_order
-- -----------------------------------------------------------------------------

CREATE TABLE "time_slots" (
  "id"         TEXT NOT NULL,
  "slot_order" INTEGER NOT NULL,
  "start_time" TIME(0) NOT NULL,
  "end_time"   TIME(0) NOT NULL,
  CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "time_slots_slot_order_positive" CHECK ("slot_order" > 0),
  CONSTRAINT "time_slots_end_after_start" CHECK ("end_time" > "start_time")
);

CREATE UNIQUE INDEX "time_slots_slot_order_key" ON "time_slots" ("slot_order");

COMMENT ON TABLE "time_slots" IS
  'Period start/end times. free_reports FK here so slot times can change via data.';

-- -----------------------------------------------------------------------------
-- classrooms — physical rooms students search for
-- PK: id | Unique: (building_id, floor_id, room_number)
-- FKs: building_id → buildings; (floor_id, building_id) → floors(id, building_id)
-- -----------------------------------------------------------------------------

CREATE TABLE "classrooms" (
  "id"          TEXT NOT NULL,
  "building_id" TEXT NOT NULL,
  "floor_id"    TEXT NOT NULL,
  "room_number" VARCHAR(32) NOT NULL,
  "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "classrooms_room_number_not_blank"
    CHECK (LENGTH(TRIM("room_number")) > 0)
);

CREATE INDEX "classrooms_building_id_idx" ON "classrooms" ("building_id");
CREATE INDEX "classrooms_floor_id_idx" ON "classrooms" ("floor_id");
CREATE INDEX "classrooms_building_id_floor_id_is_active_idx"
  ON "classrooms" ("building_id", "floor_id", "is_active");
CREATE UNIQUE INDEX "classrooms_building_id_floor_id_room_number_key"
  ON "classrooms" ("building_id", "floor_id", "room_number");

ALTER TABLE "classrooms"
  ADD CONSTRAINT "classrooms_building_id_fkey"
  FOREIGN KEY ("building_id") REFERENCES "buildings" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite FK: chosen floor must belong to the same building
ALTER TABLE "classrooms"
  ADD CONSTRAINT "classrooms_floor_id_building_id_fkey"
  FOREIGN KEY ("floor_id", "building_id")
  REFERENCES "floors" ("id", "building_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON TABLE "classrooms" IS
  'Authoritative classroom inventory. Natural key is (building, floor, room_number). is_active retires rooms without DELETE.';

-- -----------------------------------------------------------------------------
-- free_reports — anonymous free-room claims (fact table)
-- PK: id | Natural unique: (classroom_id, time_slot_id, report_date)
-- -----------------------------------------------------------------------------

CREATE TABLE "free_reports" (
  "id"                 TEXT NOT NULL,
  "classroom_id"       TEXT NOT NULL,
  "time_slot_id"       TEXT NOT NULL,
  "report_date"        DATE NOT NULL,
  "contributor_token"  VARCHAR(64) NOT NULL,
  "status"             "FreeReportStatus" NOT NULL DEFAULT 'unverified',
  "confirmation_count" INTEGER NOT NULL DEFAULT 1,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "free_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "free_reports_confirmation_count_positive"
    CHECK ("confirmation_count" >= 1),
  CONSTRAINT "free_reports_contributor_token_not_blank"
    CHECK (LENGTH(TRIM("contributor_token")) > 0)
);

-- Spec hot-path index for Finder / day+slot filters
CREATE INDEX "free_reports_report_date_time_slot_id_status_idx"
  ON "free_reports" ("report_date", "time_slot_id", "status");
CREATE INDEX "free_reports_contributor_token_report_date_idx"
  ON "free_reports" ("contributor_token", "report_date");
CREATE INDEX "free_reports_expires_at_status_idx"
  ON "free_reports" ("expires_at", "status");
CREATE UNIQUE INDEX "free_reports_classroom_id_time_slot_id_report_date_key"
  ON "free_reports" ("classroom_id", "time_slot_id", "report_date");

ALTER TABLE "free_reports"
  ADD CONSTRAINT "free_reports_classroom_id_fkey"
  FOREIGN KEY ("classroom_id") REFERENCES "classrooms" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "free_reports"
  ADD CONSTRAINT "free_reports_time_slot_id_fkey"
  FOREIGN KEY ("time_slot_id") REFERENCES "time_slots" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMENT ON TABLE "free_reports" IS
  'One claim per room+slot+day. Duplicate submits upsert confirmation_count.';
COMMENT ON COLUMN "free_reports"."contributor_token" IS
  'Anonymous device UUID — not a users FK.';
COMMENT ON COLUMN "free_reports"."expires_at" IS
  'report_date + slot end_time; cron sets status=expired after this.';

-- -----------------------------------------------------------------------------
-- occupied_reports — strikes against a free claim
-- PK: id | Unique: (free_report_id, reporter_token) — one strike per device
-- -----------------------------------------------------------------------------

CREATE TABLE "occupied_reports" (
  "id"             TEXT NOT NULL,
  "free_report_id" TEXT NOT NULL,
  "reporter_token" VARCHAR(64) NOT NULL,
  "reason"         "OccupiedReason" NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "occupied_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "occupied_reports_reporter_token_not_blank"
    CHECK (LENGTH(TRIM("reporter_token")) > 0)
);

CREATE INDEX "occupied_reports_free_report_id_idx"
  ON "occupied_reports" ("free_report_id");
CREATE INDEX "occupied_reports_reporter_token_created_at_idx"
  ON "occupied_reports" ("reporter_token", "created_at");
CREATE UNIQUE INDEX "occupied_reports_free_report_id_reporter_token_key"
  ON "occupied_reports" ("free_report_id", "reporter_token");

ALTER TABLE "occupied_reports"
  ADD CONSTRAINT "occupied_reports_free_report_id_fkey"
  FOREIGN KEY ("free_report_id") REFERENCES "free_reports" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "occupied_reports" IS
  'Occupied/wrong-info strike. Two distinct tokens → free_reports.status=hidden.';

-- -----------------------------------------------------------------------------
-- report_events — append-only independent confirmations (V2.2)
-- Unique (free_report_id, actor_token): one Still Free / confirm per device
-- Occupied strikes are NOT copied here (occupied_reports remains source of truth)
-- -----------------------------------------------------------------------------

CREATE TYPE "ReportEventType" AS ENUM ('confirmed', 'still_free');

CREATE TABLE "report_events" (
  "id"             TEXT NOT NULL,
  "free_report_id" TEXT NOT NULL,
  "event_type"     "ReportEventType" NOT NULL,
  "actor_token"    VARCHAR(64) NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_events_actor_token_not_blank"
    CHECK (LENGTH(TRIM("actor_token")) > 0)
);

CREATE UNIQUE INDEX "report_events_free_report_id_actor_token_key"
  ON "report_events" ("free_report_id", "actor_token");
CREATE INDEX "report_events_free_report_id_created_at_idx"
  ON "report_events" ("free_report_id", "created_at");

ALTER TABLE "report_events"
  ADD CONSTRAINT "report_events_free_report_id_fkey"
  FOREIGN KEY ("free_report_id") REFERENCES "free_reports" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "report_events" IS
  'Append-only positive confirmations. Tokens are never exposed publicly.';

DROP VIEW IF EXISTS "active_free_classrooms";

CREATE VIEW "active_free_classrooms" AS
SELECT
  fr.id AS free_report_id,
  fr.status,
  fr.confirmation_count,
  fr.report_date,
  fr.expires_at,
  fr.created_at,
  GREATEST(
    fr.created_at,
    COALESCE((
      SELECT MAX(re.created_at)
      FROM "report_events" re
      WHERE re.free_report_id = fr.id
    ), fr.created_at)
  ) AS last_verified_at,
  (
    SELECT COUNT(*)::int
    FROM "occupied_reports" o
    WHERE o.free_report_id = fr.id
  ) AS occupied_strike_count,
  c.id AS classroom_id,
  c.room_number,
  b.id AS building_id,
  b.code AS building_code,
  b.name AS building_name,
  f.id AS floor_id,
  f.floor_number,
  ts.id AS time_slot_id,
  ts.slot_order,
  ts.start_time,
  ts.end_time
FROM "free_reports" fr
INNER JOIN "classrooms" c ON c.id = fr.classroom_id
INNER JOIN "buildings" b ON b.id = c.building_id
INNER JOIN "floors" f ON f.id = c.floor_id
INNER JOIN "time_slots" ts ON ts.id = fr.time_slot_id
WHERE fr.status NOT IN ('hidden', 'expired')
  AND fr.expires_at > NOW()
  AND c.is_active = TRUE;

COMMENT ON VIEW "active_free_classrooms" IS
  'Denormalized read model for Class Finder. Not a base table.';
