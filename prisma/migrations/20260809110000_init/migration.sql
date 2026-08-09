-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FreeReportStatus" AS ENUM ('unverified', 'confirmed', 'hidden', 'expired');

-- CreateEnum
CREATE TYPE "OccupiedReason" AS ENUM ('occupied', 'class_in_progress', 'wrong_info', 'duplicate');

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "floor_number" INTEGER NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id"),
    -- DBMS: domain constraint — floor numbers are positive campus floors
    CONSTRAINT "floors_floor_number_positive" CHECK ("floor_number" > 0)
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL,
    "slot_order" INTEGER NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id"),
    -- DBMS: slot order is 1-based; end must be after start (same calendar day)
    CONSTRAINT "time_slots_slot_order_positive" CHECK ("slot_order" > 0),
    CONSTRAINT "time_slots_end_after_start" CHECK ("end_time" > "start_time")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "floor_id" TEXT NOT NULL,
    "room_number" VARCHAR(32) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "classrooms_room_number_not_blank" CHECK (LENGTH(TRIM("room_number")) > 0)
);

-- CreateTable
CREATE TABLE "free_reports" (
    "id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "time_slot_id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "contributor_token" VARCHAR(64) NOT NULL,
    "status" "FreeReportStatus" NOT NULL DEFAULT 'unverified',
    "confirmation_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_reports_pkey" PRIMARY KEY ("id"),
    -- DBMS: confirmation_count starts at 1 and only grows via upserts
    CONSTRAINT "free_reports_confirmation_count_positive" CHECK ("confirmation_count" >= 1),
    CONSTRAINT "free_reports_contributor_token_not_blank" CHECK (LENGTH(TRIM("contributor_token")) > 0)
);

-- CreateTable
CREATE TABLE "occupied_reports" (
    "id" TEXT NOT NULL,
    "free_report_id" TEXT NOT NULL,
    "reporter_token" VARCHAR(64) NOT NULL,
    "reason" "OccupiedReason" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupied_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "occupied_reports_reporter_token_not_blank" CHECK (LENGTH(TRIM("reporter_token")) > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "buildings_code_key" ON "buildings"("code");

-- CreateIndex
CREATE INDEX "floors_building_id_idx" ON "floors"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_floor_number_key" ON "floors"("building_id", "floor_number");

-- CreateIndex
CREATE UNIQUE INDEX "floors_id_building_id_key" ON "floors"("id", "building_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_slot_order_key" ON "time_slots"("slot_order");

-- CreateIndex
CREATE INDEX "classrooms_building_id_idx" ON "classrooms"("building_id");

-- CreateIndex
CREATE INDEX "classrooms_floor_id_idx" ON "classrooms"("floor_id");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_building_id_floor_id_room_number_key" ON "classrooms"("building_id", "floor_id", "room_number");

-- CreateIndex
-- Spec index: free_reports(report_date, time_slot_id, status) — Finder / expiry hot path
CREATE INDEX "free_reports_report_date_time_slot_id_status_idx" ON "free_reports"("report_date", "time_slot_id", "status");

-- CreateIndex
CREATE INDEX "free_reports_contributor_token_report_date_idx" ON "free_reports"("contributor_token", "report_date");

-- CreateIndex
CREATE INDEX "free_reports_expires_at_status_idx" ON "free_reports"("expires_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "free_reports_classroom_id_time_slot_id_report_date_key" ON "free_reports"("classroom_id", "time_slot_id", "report_date");

-- CreateIndex
CREATE INDEX "occupied_reports_free_report_id_idx" ON "occupied_reports"("free_report_id");

-- CreateIndex
CREATE INDEX "occupied_reports_reporter_token_created_at_idx" ON "occupied_reports"("reporter_token", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "occupied_reports_free_report_id_reporter_token_key" ON "occupied_reports"("free_report_id", "reporter_token");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- Composite FK: floor must belong to the same building as the classroom
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_floor_id_building_id_fkey" FOREIGN KEY ("floor_id", "building_id") REFERENCES "floors"("id", "building_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_reports" ADD CONSTRAINT "free_reports_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_reports" ADD CONSTRAINT "free_reports_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupied_reports" ADD CONSTRAINT "occupied_reports_free_report_id_fkey" FOREIGN KEY ("free_report_id") REFERENCES "free_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- VIEW: active_free_classrooms
-- DBMS concept: VIEW — joins fact + dimension tables; Finder reads this instead
-- of ad-hoc multi-joins. Excludes hidden/expired and past expires_at.
-- (Prisma does not manage views in schema.prisma; kept in SQL migration.)
-- =============================================================================
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
  AND fr.expires_at > NOW();
