/**
 * Lightweight in-session context for ClassFinder Help follow-ups.
 * Client-only — never persisted to the database.
 */

import type { LiveHelpIntent } from "@/lib/help/live-intent";

export type HelpSessionContext = {
  buildingCode?: string;
  floorNumber?: number;
  roomNumber?: string;
};

export const EMPTY_HELP_CONTEXT: HelpSessionContext = {};

/** Merge intent fields into session context after a live query. */
export function contextFromLiveIntent(
  intent: LiveHelpIntent,
  previous: HelpSessionContext = EMPTY_HELP_CONTEXT,
): HelpSessionContext {
  const next: HelpSessionContext = { ...previous };

  if ("buildingCode" in intent && intent.buildingCode) {
    next.buildingCode = intent.buildingCode;
  }
  if ("floorNumber" in intent && intent.floorNumber !== undefined) {
    next.floorNumber = intent.floorNumber;
  }
  if (intent.kind === "room") {
    next.roomNumber = intent.roomNumber;
  }

  return next;
}
