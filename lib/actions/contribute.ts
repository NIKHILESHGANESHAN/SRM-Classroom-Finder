"use server";

/**
 * Contributor Server Action — creates / confirms a free_report.
 *
 * DBMS concepts demonstrated:
 *   - TRANSACTION (prisma.$transaction) for report upsert
 *   - Natural-key uniqueness on (classroom_id, time_slot_id, report_date)
 *   - Authoritative classroom lookup (no find-or-create) — V2.1
 *   - Soft rate limit keyed by anonymous device token (~15 / day)
 *   - Soft-throttle (Phase 9): COUNT(hidden reports today) ≥ 3 raises the
 *     confirmation_count needed before status becomes "confirmed"
 */

import { lookupActiveClassroom } from "@/lib/classroom-lookup";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/lib/rate-limit";
import {
  buildExpiresAt,
  getCampusDateString,
  getNowMinutesInTz,
  isSlotSelectable,
  timeToMinutes,
} from "@/lib/slots";
import { isValidDeviceToken } from "@/lib/token";
import { getDeviceTokenFromCookies } from "@/lib/token-server";
import {
  getConfirmationThresholdForToken,
  nextStatusAfterConfirmation,
} from "@/lib/token-trust";

const DAILY_CONTRIBUTION_CAP = 15;

export type ContributeInput = {
  buildingId: string;
  floorId: string;
  /** Must be an active classrooms.id that belongs to buildingId + floorId */
  classroomId: string;
  timeSlotId: string;
  /** Client may pass token as fallback if cookie not yet visible to the server */
  deviceToken?: string;
};

export type ContributeResult =
  | {
      ok: true;
      kind: "created" | "confirmed" | "already_reported";
      freeReportId: string;
      confirmationCount: number;
      status: string;
    }
  | { ok: false; error: string };

function resolveToken(clientToken?: string): string | null {
  const fromCookie = getDeviceTokenFromCookies();
  if (fromCookie) return fromCookie;
  if (clientToken && isValidDeviceToken(clientToken)) return clientToken;
  return null;
}

export async function submitFreeReport(
  input: ContributeInput,
): Promise<ContributeResult> {
  const token = resolveToken(input.deviceToken);
  if (!token) {
    return {
      ok: false,
      error: "Missing device token. Refresh the page and try again.",
    };
  }

  const rl = rateLimit(
    `contribute:${token}`,
    RATE_LIMITS.contribute.limit,
    RATE_LIMITS.contribute.windowMs,
  );
  if (!rl.success) {
    logger.warn("contribute.rate_limited", { tokenPrefix: token.slice(0, 8) });
    return {
      ok: false,
      error: "Too many requests. Please wait a moment and try again.",
    };
  }

  const [building, floor] = await Promise.all([
    prisma.building.findUnique({ where: { id: input.buildingId } }),
    prisma.floor.findUnique({ where: { id: input.floorId } }),
  ]);

  if (!building) return { ok: false, error: "Unknown building." };
  if (!floor || floor.buildingId !== building.id) {
    return {
      ok: false,
      error: "That floor does not belong to the selected building.",
    };
  }

  const classroomResult = await lookupActiveClassroom({
    buildingId: building.id,
    floorId: floor.id,
    classroomId: input.classroomId,
  });
  if (!classroomResult.ok) {
    return { ok: false, error: classroomResult.error };
  }
  const classroom = classroomResult.classroom;

  const timeSlot = await prisma.timeSlot.findUnique({
    where: { id: input.timeSlotId },
  });
  if (!timeSlot) return { ok: false, error: "Unknown time slot." };

  const startMinutes = timeToMinutes(timeSlot.startTime);
  const endMinutes = timeToMinutes(timeSlot.endTime);
  const nowMinutes = getNowMinutesInTz();

  if (!isSlotSelectable({ startMinutes, endMinutes }, nowMinutes)) {
    return {
      ok: false,
      error:
        "That time slot is outside the reporting window (±5 minutes of the period).",
    };
  }

  const reportDateYmd = getCampusDateString();
  const reportDate = new Date(`${reportDateYmd}T00:00:00.000Z`);
  const expiresAt = buildExpiresAt(reportDateYmd, endMinutes);

  const todayCount = await prisma.freeReport.count({
    where: {
      contributorToken: token,
      reportDate,
    },
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.freeReport.findUnique({
        where: {
          classroomId_timeSlotId_reportDate: {
            classroomId: classroom.id,
            timeSlotId: timeSlot.id,
            reportDate,
          },
        },
      });

      if (!existing && todayCount >= DAILY_CONTRIBUTION_CAP) {
        return {
          ok: false as const,
          error:
            "Daily contribution limit reached. Thanks for helping — try again tomorrow.",
        };
      }

      if (!existing) {
        const created = await tx.freeReport.create({
          data: {
            classroomId: classroom.id,
            timeSlotId: timeSlot.id,
            reportDate,
            contributorToken: token,
            status: "unverified",
            confirmationCount: 1,
            expiresAt,
          },
        });
        return {
          ok: true as const,
          kind: "created" as const,
          freeReportId: created.id,
          confirmationCount: created.confirmationCount,
          status: created.status,
        };
      }

      if (existing.contributorToken === token) {
        return {
          ok: true as const,
          kind: "already_reported" as const,
          freeReportId: existing.id,
          confirmationCount: existing.confirmationCount,
          status: existing.status,
        };
      }

      if (existing.status === "hidden" || existing.status === "expired") {
        return {
          ok: true as const,
          kind: "already_reported" as const,
          freeReportId: existing.id,
          confirmationCount: existing.confirmationCount,
          status: existing.status,
        };
      }

      const threshold = await getConfirmationThresholdForToken(
        tx,
        existing.contributorToken,
        reportDate,
      );

      const nextCount = existing.confirmationCount + 1;
      const nextStatus = nextStatusAfterConfirmation({
        currentStatus: existing.status,
        nextConfirmationCount: nextCount,
        threshold,
      });

      const updated = await tx.freeReport.update({
        where: { id: existing.id },
        data: {
          confirmationCount: nextCount,
          status: nextStatus,
        },
      });

      return {
        ok: true as const,
        kind: "confirmed" as const,
        freeReportId: updated.id,
        confirmationCount: updated.confirmationCount,
        status: updated.status,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown";
    logger.error("contribute.submit_failed", { error: message });
    return {
      ok: false,
      error: "Something went wrong saving your report. Please try again.",
    };
  }
}
