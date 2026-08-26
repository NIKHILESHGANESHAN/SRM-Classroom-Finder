import {
  CLASSROOM_INVENTORY,
  type InventoryBuildingCode,
} from "@/prisma/data/classroom-inventory";

export type InventoryExistingRow = {
  buildingCode: string;
  floorNumber: number;
  roomNumber: string;
};

/** Keys for building:floor:room — includes inactive rows (still in the database). */
export function buildInventoryExistingKey(
  rows: InventoryExistingRow[],
): Set<string> {
  return new Set(
    rows.map(
      (row) =>
        `${row.buildingCode}:${row.floorNumber}:${row.roomNumber}`,
    ),
  );
}

export function listOfficialRoomsForFloor(
  buildingCode: InventoryBuildingCode,
  floorNumber: number,
): readonly string[] {
  return CLASSROOM_INVENTORY[buildingCode][floorNumber] ?? [];
}

/** Official inventory rooms not yet present in the classroom database. */
export function getAddableRoomsForFloor(
  buildingCode: InventoryBuildingCode,
  floorNumber: number,
  existingKey: Set<string>,
): string[] {
  return [...listOfficialRoomsForFloor(buildingCode, floorNumber)]
    .filter(
      (room) => !existingKey.has(`${buildingCode}:${floorNumber}:${room}`),
    )
    .sort();
}

export function isFloorFullyListed(
  buildingCode: InventoryBuildingCode,
  floorNumber: number,
  existingKey: Set<string>,
): boolean {
  const official = listOfficialRoomsForFloor(buildingCode, floorNumber);
  if (official.length === 0) return false;
  return getAddableRoomsForFloor(buildingCode, floorNumber, existingKey).length === 0;
}
