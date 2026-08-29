import { isMorningEasterEgg } from "@/lib/easter-egg";
import { getNowMinutesInTz } from "@/lib/slots";

/**
 * Morning Easter Egg (Finder note) — 04:00–07:50 IST with zero visible reports.
 * Independent of coverage empty-state kind (insufficient_reports vs none_free).
 */
export function shouldShowFinderMorningNote(args: {
  visibleRoomCount: number;
  hasSearch: boolean;
  mineOnly: boolean;
  nowMinutes?: number;
}): boolean {
  if (args.visibleRoomCount > 0) return false;
  if (args.hasSearch || args.mineOnly) return false;
  return isMorningEasterEgg(args.nowMinutes ?? getNowMinutesInTz());
}
