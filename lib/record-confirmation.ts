/**
 * Transaction helper: record one independent confirmation per device.
 * Used by Contributor confirmations and Finder Still Free (V2.2).
 */

import { Prisma, type ReportEventType } from "@prisma/client";
import type { TrustTx } from "@/lib/token-trust";
import {
  getConfirmationThresholdForToken,
  nextStatusAfterConfirmation,
} from "@/lib/token-trust";

export type ConfirmationResult =
  | {
      ok: true;
      kind: "confirmed" | "already_reported";
      freeReportId: string;
      confirmationCount: number;
      status: string;
    }
  | { ok: false; error: string };

export async function applyIndependentConfirmation(
  tx: TrustTx,
  args: {
    freeReportId: string;
    actorToken: string;
    eventType: ReportEventType;
    /** When true, tokens that already occupied-reported cannot Still Free. */
    rejectIfOccupiedByActor?: boolean;
  },
): Promise<ConfirmationResult> {
  const freeReport = await tx.freeReport.findUnique({
    where: { id: args.freeReportId },
    select: {
      id: true,
      contributorToken: true,
      status: true,
      confirmationCount: true,
      reportDate: true,
    },
  });

  if (!freeReport) {
    return { ok: false, error: "That free room is no longer listed." };
  }

  if (freeReport.status === "hidden" || freeReport.status === "expired") {
    return {
      ok: true,
      kind: "already_reported",
      freeReportId: freeReport.id,
      confirmationCount: freeReport.confirmationCount,
      status: freeReport.status,
    };
  }

  if (freeReport.contributorToken === args.actorToken) {
    return {
      ok: true,
      kind: "already_reported",
      freeReportId: freeReport.id,
      confirmationCount: freeReport.confirmationCount,
      status: freeReport.status,
    };
  }

  if (args.rejectIfOccupiedByActor) {
    const occupied = await tx.occupiedReport.findUnique({
      where: {
        freeReportId_reporterToken: {
          freeReportId: freeReport.id,
          reporterToken: args.actorToken,
        },
      },
      select: { id: true },
    });
    if (occupied) {
      return {
        ok: false,
        error: "You already reported this room occupied from this device.",
      };
    }
  }

  try {
    await tx.reportEvent.create({
      data: {
        freeReportId: freeReport.id,
        eventType: args.eventType,
        actorToken: args.actorToken,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: true,
        kind: "already_reported",
        freeReportId: freeReport.id,
        confirmationCount: freeReport.confirmationCount,
        status: freeReport.status,
      };
    }
    throw error;
  }

  const threshold = await getConfirmationThresholdForToken(
    tx,
    freeReport.contributorToken,
    freeReport.reportDate,
  );
  const nextCount = freeReport.confirmationCount + 1;
  const nextStatus = nextStatusAfterConfirmation({
    currentStatus: freeReport.status,
    nextConfirmationCount: nextCount,
    threshold,
  });

  const updated = await tx.freeReport.update({
    where: { id: freeReport.id },
    data: {
      confirmationCount: nextCount,
      status: nextStatus,
    },
  });

  return {
    ok: true,
    kind: "confirmed",
    freeReportId: updated.id,
    confirmationCount: updated.confirmationCount,
    status: updated.status,
  };
}
