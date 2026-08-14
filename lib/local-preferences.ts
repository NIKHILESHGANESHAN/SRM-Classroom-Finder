/**
 * Local-only Finder personalization (V2.4).
 * Never sent to the server. No accounts. Validated JSON only.
 */

export const FAVORITES_STORAGE_KEY = "srm-classroom-finder:favorites:v1";
export const RECENT_ROOMS_STORAGE_KEY = "srm-classroom-finder:recent-rooms:v1";
export const MAX_RECENT_ROOMS = 8;

export type RecentRoom = {
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
  savedAt: number;
};

function isBuildingCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z0-9]{2,8}$/i.test(value.trim());
}

export function parseFavoriteCodes(
  raw: string | null,
  allowedCodes: readonly string[],
): string[] {
  const allowed = new Set(allowedCodes.map((c) => c.toUpperCase()));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { codes?: unknown }).codes)
        ? (parsed as { codes: unknown[] }).codes
        : null;
    if (!list) return [];
    const out: string[] = [];
    for (const item of list) {
      if (!isBuildingCode(item)) continue;
      const code = item.trim().toUpperCase();
      if (!allowed.has(code)) continue;
      if (out.includes(code)) continue;
      out.push(code);
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeFavoriteCodes(codes: readonly string[]): string {
  return JSON.stringify({ codes: [...codes] });
}

export function toggleFavoriteCode(
  current: readonly string[],
  code: string,
  allowedCodes: readonly string[],
): string[] {
  const allowed = new Set(allowedCodes.map((c) => c.toUpperCase()));
  const next = code.trim().toUpperCase();
  if (!allowed.has(next)) return [...current];
  if (current.includes(next)) return current.filter((c) => c !== next);
  return [...current, next];
}

function isRecentRoom(value: unknown): value is RecentRoom {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    isBuildingCode(row.buildingCode) &&
    typeof row.floorNumber === "number" &&
    Number.isInteger(row.floorNumber) &&
    row.floorNumber > 0 &&
    row.floorNumber < 100 &&
    typeof row.roomNumber === "string" &&
    row.roomNumber.trim().length > 0 &&
    row.roomNumber.trim().length <= 16 &&
    typeof row.savedAt === "number" &&
    Number.isFinite(row.savedAt)
  );
}

export function recentRoomKey(room: Pick<RecentRoom, "buildingCode" | "floorNumber" | "roomNumber">): string {
  return `${room.buildingCode.toUpperCase()}|${room.floorNumber}|${room.roomNumber.trim()}`;
}

export function parseRecentRooms(raw: string | null): RecentRoom[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { rooms?: unknown }).rooms)
        ? (parsed as { rooms: unknown[] }).rooms
        : null;
    if (!list) return [];
    const out: RecentRoom[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      if (!isRecentRoom(item)) continue;
      const room: RecentRoom = {
        buildingCode: item.buildingCode.trim().toUpperCase(),
        floorNumber: item.floorNumber,
        roomNumber: item.roomNumber.trim(),
        savedAt: item.savedAt,
      };
      const key = recentRoomKey(room);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(room);
    }
    return out
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, MAX_RECENT_ROOMS);
  } catch {
    return [];
  }
}

export function serializeRecentRooms(rooms: readonly RecentRoom[]): string {
  return JSON.stringify({ rooms: rooms.slice(0, MAX_RECENT_ROOMS) });
}

export function prioritizeFavoriteBuildings<T extends { buildingCode: string }>(
  rooms: readonly T[],
  favoriteCodes: readonly string[],
): T[] {
  if (favoriteCodes.length === 0) return [...rooms];
  const rank = new Map(
    favoriteCodes.map((code, index) => [code.toUpperCase(), index]),
  );
  return [...rooms].sort((a, b) => {
    const ra = rank.get(a.buildingCode.toUpperCase()) ?? 1000;
    const rb = rank.get(b.buildingCode.toUpperCase()) ?? 1000;
    return ra - rb;
  });
}

export function pushRecentRoom(
  current: readonly RecentRoom[],
  next: Omit<RecentRoom, "savedAt"> & { savedAt?: number },
): RecentRoom[] {
  const room: RecentRoom = {
    buildingCode: next.buildingCode.trim().toUpperCase(),
    floorNumber: next.floorNumber,
    roomNumber: next.roomNumber.trim(),
    savedAt: next.savedAt ?? Date.now(),
  };
  if (!isRecentRoom(room)) return [...current];
  const key = recentRoomKey(room);
  const without = current.filter((r) => recentRoomKey(r) !== key);
  return [room, ...without].slice(0, MAX_RECENT_ROOMS);
}
