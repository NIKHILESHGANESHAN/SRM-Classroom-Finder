-- V2.1: classrooms become authoritative inventory (soft-retire + Finder/Contributor lookups).
-- Do not invent rooms here — seed writes the owner-verified list.

-- AlterTable
ALTER TABLE "classrooms" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
-- Contributor / coverage queries: WHERE building_id = ? AND floor_id = ? AND is_active = true
CREATE INDEX "classrooms_building_id_floor_id_is_active_idx"
  ON "classrooms"("building_id", "floor_id", "is_active");

COMMENT ON COLUMN "classrooms"."is_active" IS
  'Soft-retire without DELETE. Inactive rooms stay for historical free_reports.';

-- VIEW: hide retired classrooms from Finder while retaining report history.
CREATE OR REPLACE VIEW "active_free_classrooms" AS
SELECT
    fr.id AS free_report_id,
    fr.status,
    fr.confirmation_count,
    fr.report_date,
    fr.expires_at,
    fr.created_at,
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
