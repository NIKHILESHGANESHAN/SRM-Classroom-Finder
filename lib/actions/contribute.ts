"use server";

/**
 * Contributor Server Action — creates / confirms a free_report.
 *
 * DBMS concepts demonstrated:
 *   - TRANSACTION (prisma.$transaction) for classroom find-or-create + upsert
 *   - Natural-key uniqueness on (classroom_id, time_slot_id, report_date)
 *   - Soft rate limit keyed by anonymous device token (~15 / day)
 */

import { prisma } from "@/lib/prisma";
import {
  buildExpiresAt,
  getCampusDateString,
  getNowMinutesInTz,
  isSlotSelectable,
  timeToMinutes,
} from "@/lib/slots";
import { isValidDeviceToken } from "@/lib/token";
import { getDeviceTokenFromCookies } from "@/lib/token-server";

const DAILY_CONTRIBUTION_CAP = 15;

export type ContributeInput = {
  buildingId: string;
  floorId: string;
  roomNumber: string;
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

  const roomNumber = input.roomNumber.trim().toUpperCase();
  if (!roomNumber || roomNumber.length > 32) {
    return { ok: false, error: "Enter a valid room number." };
  }
  if (!/^[A-Z0-9][A-Z0-9\-./]*$/i.test(roomNumber)) {
    return {
      ok: false,
      error: "Room number can only include letters, numbers, and - . /",
    };
  }

  const [building, floor, timeSlot] = await Promise.all([
    prisma.building.findUnique({ where: { id: input.buildingId } }),
    prisma.floor.findUnique({ where: { id: input.floorId } }),
    prisma.timeSlot.findUnique({ where: { id: input.timeSlotId } }),
  ]);

  if (!building) return { ok: false, error: "Unknown building." };
  if (!floor || floor.buildingId !== building.id) {
    return {
      ok: false,
      error: "That floor does not belong to the selected building.",
    };
  }
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
      const classroom = await tx.classroom.upsert({
        where: {
          buildingId_floorId_roomNumber: {
            buildingId: building.id,
            floorId: floor.id,
            roomNumber,
          },
        },
        create: {
          buildingId: building.id,
          floorId: floor.id,
          roomNumber,
        },
        update: {},
      });

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

      const nextCount = existing.confirmationCount + 1;
      const nextStatus =
        nextCount >= 2 && existing.status === "unverified"
          ? ("confirmed" as const)
          : existing.status;

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
    console.error("[contribute] submitFreeReport failed", error);
    return {
      ok: false,
      error: "Something went wrong saving your report. Please try again.",
    };
  }
}
