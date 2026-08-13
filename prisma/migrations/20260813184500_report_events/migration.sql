-- V2.2: append-only positive confirmation events (Still Free / Contributor confirm).
-- Occupied strikes remain in occupied_reports; do not duplicate them here.

CREATE TYPE "ReportEventType" AS ENUM ('confirmed', 'still_free');

CREATE TABLE "report_events" (
    "id" TEXT NOT NULL,
    "free_report_id" TEXT NOT NULL,
    "event_type" "ReportEventType" NOT NULL,
    "actor_token" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "report_events_actor_token_not_blank"
      CHECK (LENGTH(TRIM("actor_token")) > 0)
);

CREATE UNIQUE INDEX "report_events_free_report_id_actor_token_key"
  ON "report_events"("free_report_id", "actor_token");

CREATE INDEX "report_events_free_report_id_created_at_idx"
  ON "report_events"("free_report_id", "created_at");

ALTER TABLE "report_events"
  ADD CONSTRAINT "report_events_free_report_id_fkey"
  FOREIGN KEY ("free_report_id") REFERENCES "free_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE "report_events" IS
  'Append-only independent confirmations. One row per (report, device). Tokens are not public.';

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
