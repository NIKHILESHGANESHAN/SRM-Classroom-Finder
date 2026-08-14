/**
 * Public live-Finder answers for the help assistant (V2.6).
 * Reuses queryActiveFreeClassrooms — no second availability system.
 */

import {
  getFinderRefreshData,
  type ActiveFreeClassroom,
  type FinderFilters,
} from "@/lib/finder-data";
import type { LiveHelpIntent } from "@/lib/help/live-intent";
import { applyFinderFocus } from "@/lib/finder-realtime";

const MAX_LIST = 12;

/** All currently active reports, not only the campus “now” slot. */
const LIVE_BASE: FinderFilters = { timeSlotId: "all" };

function formatRoom(room: ActiveFreeClassroom): string {
  return `${room.buildingCode} ${room.roomNumber} (Floor ${room.floorNumber})`;
}

function listRooms(rooms: ActiveFreeClassroom[]): string {
  const slice = rooms.slice(0, MAX_LIST);
  const lines = slice.map((r) => `• ${formatRoom(r)}`);
  if (rooms.length > MAX_LIST) {
    lines.push(`• …and ${rooms.length - MAX_LIST} more on Class Finder`);
  }
  return lines.join("\n");
}

export async function answerLiveHelpIntent(
  intent: LiveHelpIntent,
): Promise<string> {
  if (intent.kind === "ending_soon") {
    const data = await getFinderRefreshData(LIVE_BASE);
    const rooms = applyFinderFocus(data.rooms, "ending", Date.now());
    if (rooms.length === 0) {
      return "There are currently no classrooms ending soon. Open Class Finder and choose Ending soon to double-check.";
    }
    return `These classrooms are currently ending soon (expire within about 10 minutes):\n${listRooms(rooms)}`;
  }

  if (intent.kind === "recent") {
    const data = await getFinderRefreshData(LIVE_BASE);
    const rooms = applyFinderFocus(data.rooms, "recent", Date.now());
    if (rooms.length === 0) {
      return "There are currently no recently verified free classrooms (last 10 minutes). Other rooms may still be listed under All free.";
    }
    return `These classrooms were recently verified (within about 10 minutes):\n${listRooms(rooms)}`;
  }

  if (intent.kind === "general") {
    const data = await getFinderRefreshData(LIVE_BASE);
    if (data.rooms.length === 0) {
      return "There are currently no classrooms reported free. That does not mean every room on campus is occupied — nobody may have reported yet.";
    }
    return `There are currently ${data.rooms.length} classroom${data.rooms.length === 1 ? "" : "s"} reported free:\n${listRooms(data.rooms)}`;
  }

  const data = await getFinderRefreshData({
    ...LIVE_BASE,
    buildingId: intent.buildingCode,
  });

  if (intent.kind === "building") {
    if (data.rooms.length === 0) {
      return `There are currently no classrooms reported free in ${intent.buildingCode}.`;
    }
    return `There are currently ${data.rooms.length} classroom${data.rooms.length === 1 ? "" : "s"} reported free in ${intent.buildingCode}:\n${listRooms(data.rooms)}`;
  }

  if (intent.kind === "floor") {
    const rooms = data.rooms.filter((r) => r.floorNumber === intent.floorNumber);
    if (rooms.length === 0) {
      return `There are currently no classrooms reported free in ${intent.buildingCode} Floor ${intent.floorNumber}.`;
    }
    return `There are currently ${rooms.length} classroom${rooms.length === 1 ? "" : "s"} reported free in ${intent.buildingCode} Floor ${intent.floorNumber}:\n${listRooms(rooms)}`;
  }

  const rooms = data.rooms.filter((r) => {
    if (r.roomNumber.toUpperCase() !== intent.roomNumber.toUpperCase()) {
      return false;
    }
    if (intent.floorNumber !== undefined && r.floorNumber !== intent.floorNumber) {
      return false;
    }
    return true;
  });
  const hit = rooms[0];
  if (!hit) {
    const floorBit =
      intent.floorNumber !== undefined ? ` Floor ${intent.floorNumber}` : "";
    return `${intent.buildingCode}${floorBit} ${intent.roomNumber} is not currently reported free.`;
  }
  return `${formatRoom(hit)} is currently reported free (${hit.status === "confirmed" ? "Confirmed" : "Unverified"}).`;
}
