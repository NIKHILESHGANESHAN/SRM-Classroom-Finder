/**
 * Controlled live-Finder intents for the V2.6 help assistant.
 * Client-safe: no Prisma, no env secrets.
 */

import { normalizeHelpText } from "@/lib/help/scope";

export type LiveHelpIntent =
  | { kind: "building"; buildingCode: string }
  | { kind: "floor"; buildingCode: string; floorNumber: number }
  | { kind: "room"; buildingCode: string; roomNumber: string; floorNumber?: number }
  | { kind: "ending_soon" }
  | { kind: "recent" }
  | { kind: "general" };

const BUILDING = "(ub|tp1|tp2)";

function parseBuilding(raw: string): string {
  return raw.toUpperCase();
}

export function parseLiveHelpIntent(input: string): LiveHelpIntent | null {
  const n = normalizeHelpText(input);
  if (!n) return null;

  if (
    /\b(how (do|does|to)|what does|explain|why can't|why cant|do i need)\b/.test(
      n,
    ) &&
    !/\b(currently|right now|are there|is ub|is tp)\b/.test(n)
  ) {
    return null;
  }

  if (/\b(ending soon|expiring soon|about to expire)\b/.test(n)) {
    return { kind: "ending_soon" };
  }
  if (/\b(recently (verified|reported)|just (verified|reported))\b/.test(n)) {
    return { kind: "recent" };
  }

  const roomFloor = n.match(
    new RegExp(`\\b${BUILDING}\\s+floor\\s+(\\d{1,2})\\s+(?:room\\s+)?(\\d{2,5}[a-z]?)\\b`),
  );
  if (roomFloor) {
    return {
      kind: "room",
      buildingCode: parseBuilding(roomFloor[1]!),
      floorNumber: Number(roomFloor[2]),
      roomNumber: roomFloor[3]!.toUpperCase(),
    };
  }

  const isRoom = n.match(
    new RegExp(`\\bis\\s+${BUILDING}\\s+(\\d{2,5}[a-z]?)\\s+free\\b`),
  );
  if (isRoom) {
    return {
      kind: "room",
      buildingCode: parseBuilding(isRoom[1]!),
      roomNumber: isRoom[2]!.toUpperCase(),
    };
  }

  const floor = n.match(
    new RegExp(
      `\\b(?:any |what |which )?(?:free )?(?:class)?rooms? (?:in |on )?${BUILDING}\\s+floor\\s+(\\d{1,2})\\b`,
    ),
  );
  if (floor) {
    return {
      kind: "floor",
      buildingCode: parseBuilding(floor[1]!),
      floorNumber: Number(floor[2]),
    };
  }

  const floorAlt = n.match(new RegExp(`\\b${BUILDING}\\s+floor\\s+(\\d{1,2})\\b`));
  if (floorAlt && /\b(free|available|any)\b/.test(n)) {
    return {
      kind: "floor",
      buildingCode: parseBuilding(floorAlt[1]!),
      floorNumber: Number(floorAlt[2]),
    };
  }

  const building = n.match(
    new RegExp(
      `\\b(?:are there |any |what |which )?(?:free )?(?:class)?rooms? (?:in |at |for )?${BUILDING}\\b`,
    ),
  );
  if (building) {
    return { kind: "building", buildingCode: parseBuilding(building[1]!) };
  }

  const inBuilding = n.match(
    new RegExp(`\\b(?:free|available).+\\b${BUILDING}\\b|\\b${BUILDING}\\b.+(?:free|available)`),
  );
  if (inBuilding) {
    const code = n.match(new RegExp(`\\b${BUILDING}\\b`));
    if (code) return { kind: "building", buildingCode: parseBuilding(code[1]!) };
  }

  if (
    /\b(any|currently|right now|what'?s)\b/.test(n) &&
    /\b(free|available)\b/.test(n) &&
    /\b(room|rooms|classroom|classrooms)\b/.test(n)
  ) {
    return { kind: "general" };
  }

  return null;
}
