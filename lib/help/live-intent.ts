/**
 * Controlled live-Finder intents for the V2.6 help assistant.
 * Client-safe: no Prisma, no env secrets.
 */

import { normalizeHelpText } from "@/lib/help/scope";
import type { HelpSessionContext } from "@/lib/help/session-context";

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

function roomIntent(
  buildingCode: string,
  roomNumber: string,
  slotScope: LiveSlotScope,
  floorNumber?: number,
): LiveHelpIntent {
  return {
    kind: "room",
    buildingCode: parseBuilding(buildingCode),
    roomNumber: roomNumber.toUpperCase(),
    floorNumber,
    slotScope,
  };
}

/** Building + numeric room — BUILDING must not be wrapped in extra parens. */
function matchBuildingRoom(
  n: string,
): { buildingCode: string; roomNumber: string } | null {
  const prefixed = n.match(
    new RegExp(
      `(?:\\b(?:is|check|see)\\s+)?${BUILDING}[- ]?(\\d{2,5}[a-z]?)(?:\\s+free|\\s+available)?\\b`,
    ),
  );
  if (prefixed) {
    return { buildingCode: prefixed[1]!, roomNumber: prefixed[2]! };
  }

  const explicitFree = n.match(
    new RegExp(`\\bis\\s+${BUILDING}\\s+(\\d{2,5}[a-z]?)\\s+free\\b`),
  );
  if (explicitFree) {
    return { buildingCode: explicitFree[1]!, roomNumber: explicitFree[2]! };
  }

  const roomInBuilding = n.match(
    new RegExp(
      `\\b(?:is\\s+)?(?:room\\s+)?(\\d{2,5}[a-z]?)(?:\\s+in|\\s+at)\\s+${BUILDING}\\b`,
    ),
  );
  if (roomInBuilding) {
    return {
      buildingCode: roomInBuilding[2]!,
      roomNumber: roomInBuilding[1]!,
    };
  }

  const bare = n.match(new RegExp(`\\b${BUILDING}[- ]?(\\d{2,5}[a-z]?)\\b`));
  if (bare) {
    return { buildingCode: bare[1]!, roomNumber: bare[2]! };
  }

  return null;
}

function isRoomLookupQuery(n: string): boolean {
  return (
    /\b(free|available|check|is|status|occupied|room)\b/.test(n) ||
    /\b(?:what about|how about)\b/.test(n) ||
    new RegExp(`\\b${BUILDING}[- ]?\\d{2,5}`).test(n)
  );
}

export function parseLiveHelpIntent(
  input: string,
  context: HelpSessionContext = {},
): LiveHelpIntent | null {
  const n = normalizeHelpText(input);
  if (!n) return null;
  const slotScope = slotScopeFromText(n);

  if (
    /\b(how (do|does|to)|what does|explain|why can't|why cant|do i need)\b/.test(
      n,
    ) &&
    !/\b(currently|right now|are there|is ub|is tp|check|free|available)\b/.test(n)
  ) {
    return null;
  }

  if (/\b(ending soon|expiring soon|about to expire)\b/.test(n)) {
    return { kind: "ending_soon", slotScope };
  }
  if (/\b(recently (verified|reported)|just (verified|reported))\b/.test(n)) {
    return { kind: "recent", slotScope };
  }

  /** Follow-up: "what about 302?" / "how about room 305" */
  const followRoom = n.match(
    /\b(?:what about|how about|and)\s+(?:room\s+)?(\d{2,5}[a-z]?)\b/,
  );
  if (followRoom && context.buildingCode) {
    return roomIntent(
      context.buildingCode,
      followRoom[1]!,
      slotScope,
      context.floorNumber,
    );
  }

  /** Follow-up with building: "what about UB 302?" */
  const followBuildingRoom = n.match(
    new RegExp(
      `\\b(?:what about|how about)\\s+${BUILDING}[- ]?(\\d{2,5}[a-z]?)\\b`,
    ),
  );
  if (followBuildingRoom) {
    return roomIntent(
      followBuildingRoom[1]!,
      followBuildingRoom[2]!,
      slotScope,
    );
  }

  const bareRoom = n.match(/^(\d{2,5}[a-z]?)$/);
  if (bareRoom && context.buildingCode) {
    return roomIntent(
      context.buildingCode,
      bareRoom[1]!,
      slotScope,
      context.floorNumber,
    );
  }

  const roomFloor = n.match(
    new RegExp(`\\b${BUILDING}\\s+floor\\s+(\\d{1,2})\\s+(?:room\\s+)?(\\d{2,5}[a-z]?)\\b`),
  );
  if (roomFloor) {
    return roomIntent(
      roomFloor[1]!,
      roomFloor[3]!,
      slotScope,
      Number(roomFloor[2]),
    );
  }

  /** Building + room — must run before floor/building list intents. */
  if (!/\bfloor\b/.test(n)) {
    const buildingRoom = matchBuildingRoom(n);
    if (buildingRoom && isRoomLookupQuery(n)) {
      return roomIntent(
        buildingRoom.buildingCode,
        buildingRoom.roomNumber,
        slotScope,
      );
    }
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

  const floorOnly = n.match(/^(?:floor\s+)?(\d{1,2})$/);
  if (floorOnly && context.buildingCode) {
    return {
      kind: "floor",
      buildingCode: context.buildingCode,
      floorNumber: Number(floorOnly[1]),
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
    /\b(any|currently|right now|what'?s|find|show|where)\b/.test(n) &&
    /\b(free|available|study|empty)\b/.test(n) &&
    /\b(room|rooms|classroom|classrooms)\b/.test(n)
  ) {
    return { kind: "general", slotScope };
  }

  return null;
}
