"use server";

/**
 * Occupied-report Server Action — flags a free_report as wrong / occupied.
 *
 * DBMS concepts demonstrated:
 *   - TRANSACTION (prisma.$transaction) for insert + 2-strike auto-hide
 *   - UNIQUE (free_report_id, reporter_token) — one strike per device
 *   - COUNT(occupied_reports) >= 2 → free_reports.status = 'hidden'
 */

import { Prisma, type OccupiedReason } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/lib/rate-limit";
import { isValidDeviceToken } from "@/lib/token";
import { getDeviceTokenFromCookies } from "@/lib/token-server";

const OCCUPIED_REASONS = [
  "occupied",
  "class_in_progress",
  "wrong_info",
  "duplicate",
] as const satisfies readonly OccupiedReason[];

export type ReportReason = (typeof OCCUPIED_REASONS)[number];

export type ReportInput = {
  freeReportId: string;
  reason: ReportReason;
  /** Client may pass token as fallback if cookie not yet visible to the server */
  deviceToken?: string;
};

export type ReportResult =
  | {
      ok: true;
      kind: "created" | "already_reported";
      occupiedReportId: string;
      strikeCount: number;
      hidden: boolean;
    }
  | { ok: false; error: string };

function resolveToken(clientToken?: string): string | null {
  const fromCookie = getDeviceTokenFromCookies();
  if (fromCookie) return fromCookie;
  if (clientToken && isValidDeviceToken(clientToken)) return clientToken;
  return null;
}

function isReportReason(value: string): value is ReportReason {
  return (OCCUPIED_REASONS as readonly string[]).includes(value);
}

/**
 * Submit an occupied strike against a free classroom claim.
 * Second distinct device token hides the free report inside the same transaction.
 */
export async function submitOccupiedReport(
  input: ReportInput,
): Promise<ReportResult> {
  const token = resolveToken(input.deviceToken);
  if (!token) {
    return {
      ok: false,
      error: "Missing device token. Refresh the page and try again.",
    };
  }

  const rl = rateLimit(
    `report:${token}`,
    RATE_LIMITS.report.limit,
    RATE_LIMITS.report.windowMs,
  );
  if (!rl.success) {
    logger.warn("report.rate_limited", { tokenPrefix: token.slice(0, 8) });
    return {
      ok: false,
      error: "Too many requests. Please wait a moment and try again.",
    };
  }

  if (!input.freeReportId?.trim()) {
    return { ok: false, error: "Missing free report id." };
  }

  if (!isReportReason(input.reason)) {
    return { ok: false, error: "Pick a valid reason." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const freeReport = await tx.freeReport.findUnique({
        where: { id: input.freeReportId },
        select: { id: true, status: true },
      });

      if (!freeReport) {
        return { ok: false as const, error: "That free room is no longer listed." };
      }

      if (freeReport.status === "hidden" || freeReport.status === "expired") {
        return {
          ok: false as const,
          error: "That free room is no longer listed.",
        };
      }

      const existing = await tx.occupiedReport.findUnique({
        where: {
          freeReportId_reporterToken: {
            freeReportId: freeReport.id,
            reporterToken: token,
          },
        },
      });

      if (existing) {
        const strikeCount = await tx.occupiedReport.count({
          where: { freeReportId: freeReport.id },
        });
        return {
          ok: true as const,
          kind: "already_reported" as const,
          occupiedReportId: existing.id,
          strikeCount,
          hidden: strikeCount >= 2,
        };
      }

      let created;
      try {
        created = await tx.occupiedReport.create({
          data: {
            freeReportId: freeReport.id,
            reporterToken: token,
            reason: input.reason,
          },
        });
      } catch (error) {
        // Race: unique (free_report_id, reporter_token) — treat as duplicate
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const dup = await tx.occupiedReport.findUnique({
            where: {
              freeReportId_reporterToken: {
                freeReportId: freeReport.id,
                reporterToken: token,
              },
            },
          });
          const strikeCount = await tx.occupiedReport.count({
            where: { freeReportId: freeReport.id },
          });
          return {
            ok: true as const,
            kind: "already_reported" as const,
            occupiedReportId: dup?.id ?? "",
            strikeCount,
            hidden: strikeCount >= 2,
          };
        }
        throw error;
      }

      const strikeCount = await tx.occupiedReport.count({
        where: { freeReportId: freeReport.id },
      });

      let hidden = false;
      if (strikeCount >= 2) {
        await tx.freeReport.update({
          where: { id: freeReport.id },
          data: { status: "hidden" },
        });
        hidden = true;
      }

      return {
        ok: true as const,
        kind: "created" as const,
        occupiedReportId: created.id,
        strikeCount,
        hidden,
      };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown";
    logger.error("report.submit_failed", { error: message });
    return {
      ok: false,
      error: "Something went wrong submitting your report. Please try again.",
    };
  }
}
