/**
 * Controlled live-Finder intents for the V2.6 help assistant.
 * Client-safe: no Prisma, no env secrets.
 */

import { normalizeHelpText } from "@/lib/help/scope";

/** Matches Finder: omit slot → current campus slot; `all` → every active report. */
export type LiveSlotScope = "current" | "all";

export type LiveHelpIntent =
  | {
      kind: "building";
      buildingCode: string;
      slotScope?: LiveSlotScope;
    }
  | {
      kind: "floor";
      buildingCode: string;
      floorNumber: number;
      slotScope?: LiveSlotScope;
    }
  | {
      kind: "room";
      buildingCode: string;
      roomNumber: string;
      floorNumber?: number;
      slotScope?: LiveSlotScope;
    }
  | { kind: "ending_soon"; slotScope?: LiveSlotScope }
  | { kind: "recent"; slotScope?: LiveSlotScope }
  | { kind: "general"; slotScope?: LiveSlotScope };

function slotScopeFromText(n: string): LiveSlotScope {
  if (
    /\b(all slots?|any slot|every slot|across (all )?slots|all (active )?reports)\b/.test(
      n,
    )
  ) {
    return "all";
  }
  return "current";
}

const BUILDING = "(ub|tp1|tp2)";

function parseBuilding(raw: string): string {
  return raw.toUpperCase();
}

export function parseLiveHelpIntent(input: string): LiveHelpIntent | null {
  const n = normalizeHelpText(input);
  if (!n) return null;
  const slotScope = slotScopeFromText(n);

  if (
    /\b(how (do|does|to)|what does|explain|why can't|why cant|do i need)\b/.test(
      n,
    ) &&
    !/\b(currently|right now|are there|is ub|is tp)\b/.test(n)
  ) {
    return null;
  }

  if (/\b(ending soon|expiring soon|about to expire)\b/.test(n)) {
    return { kind: "ending_soon", slotScope };
  }
  if (/\b(recently (verified|reported)|just (verified|reported))\b/.test(n)) {
    return { kind: "recent", slotScope };
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
      slotScope,
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
      slotScope,
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
      slotScope,
    };
  }

  const floorAlt = n.match(new RegExp(`\\b${BUILDING}\\s+floor\\s+(\\d{1,2})\\b`));
  if (floorAlt && /\b(free|available|any)\b/.test(n)) {
    return {
      kind: "floor",
      buildingCode: parseBuilding(floorAlt[1]!),
      floorNumber: Number(floorAlt[2]),
      slotScope,
    };
  }

  const building = n.match(
    new RegExp(
      `\\b(?:are there |any |what |which )?(?:free )?(?:class)?rooms? (?:in |at |for )?${BUILDING}\\b`,
    ),
  );
  if (building) {
    return {
      kind: "building",
      buildingCode: parseBuilding(building[1]!),
      slotScope,
    };
  }

  const inBuilding = n.match(
    new RegExp(`\\b(?:free|available).+\\b${BUILDING}\\b|\\b${BUILDING}\\b.+(?:free|available)`),
  );
  if (inBuilding) {
    const code = n.match(new RegExp(`\\b${BUILDING}\\b`));
    if (code) {
      return {
        kind: "building",
        buildingCode: parseBuilding(code[1]!),
        slotScope,
      };
    }
  }

  if (
    /\b(any|currently|right now|what'?s)\b/.test(n) &&
    /\b(free|available)\b/.test(n) &&
    /\b(room|rooms|classroom|classrooms)\b/.test(n)
  ) {
    return { kind: "general", slotScope };
  }

  return null;
}
