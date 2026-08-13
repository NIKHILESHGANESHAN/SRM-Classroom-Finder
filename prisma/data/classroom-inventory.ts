/**
 * Owner-verified classroom inventory for V2.1.
 *
 * Rules:
 *   - Only rooms listed here may be seeded.
 *   - Do not infer missing numbers (e.g. UB 509 is absent on purpose).
 *   - Do not generate sequential ranges.
 *   - TP1 is intentionally omitted until a verified V3 list is supplied.
 */

export type InventoryBuildingCode = "UB" | "TP2";

/** Floor number → room numbers (as they appear on the door). */
export type FloorRoomMap = Readonly<Record<number, readonly string[]>>;

export const CLASSROOM_INVENTORY: Readonly<
  Record<InventoryBuildingCode, FloorRoomMap>
> = {
  UB: {
    5: [
      "501",
      "502",
      "503",
      "504",
      "505",
      "506",
      "507",
      "508",
      "510",
      "511",
      "512",
      "513",
      "514",
      "515",
    ],
    6: [
      "601",
      "602",
      "603",
      "604",
      "605",
      "606",
      "607",
      "609",
      "610",
      "611",
      "613",
      "618",
      "620",
    ],
    7: ["702", "716", "717", "718", "719"],
    8: ["806", "807", "808", "810", "811", "818", "819", "822", "823"],
    9: ["901", "902", "903", "904", "905", "906", "907", "909", "910", "919"],
    10: [
      "1001",
      "1002",
      "1003",
      "1004",
      "1005",
      "1006",
      "1007",
      "1009",
      "1011",
      "1012",
      "1013",
      "1014",
      "1015",
      "1016",
      "1019",
    ],
    11: ["1102", "1103", "1111", "1112"],
    12: ["1205", "1206", "1207", "1211", "1212", "1216", "1219"],
  },
  TP2: {
    2: ["204", "205", "206", "213", "214", "215", "219", "220"],
    3: ["304", "305", "306", "313", "314", "315", "319", "320"],
    5: ["504", "505", "506", "513", "514", "515", "519", "520"],
    6: ["604", "605", "606", "613", "614", "615", "619", "620"],
    8: ["804", "805", "806", "813", "814", "815", "819", "820"],
    9: ["904", "905", "906", "913", "914", "915", "919", "920"],
    10: ["1004", "1005", "1006", "1013", "1014", "1015", "1019", "1020"],
    11: ["1104", "1105", "1125", "1126", "1130", "1131"],
    12: ["1204", "1205", "1206", "1213", "1214", "1215", "1219", "1220"],
    13: ["1304", "1305", "1306", "1313", "1314", "1315", "1319", "1320"],
  },
};

export type ClassroomInventoryRow = {
  buildingCode: InventoryBuildingCode;
  floorNumber: number;
  roomNumber: string;
};

export function flattenClassroomInventory(): ClassroomInventoryRow[] {
  const rows: ClassroomInventoryRow[] = [];
  for (const buildingCode of Object.keys(
    CLASSROOM_INVENTORY,
  ) as InventoryBuildingCode[]) {
    const floors = CLASSROOM_INVENTORY[buildingCode];
    for (const floorKey of Object.keys(floors)) {
      const floorNumber = Number(floorKey);
      for (const roomNumber of floors[floorNumber] ?? []) {
        rows.push({ buildingCode, floorNumber, roomNumber });
      }
    }
  }
  return rows;
}

export function countInventoryRooms(
  buildingCode: InventoryBuildingCode,
): number {
  const floors = CLASSROOM_INVENTORY[buildingCode];
  let n = 0;
  for (const floorKey of Object.keys(floors)) {
    n += floors[Number(floorKey)]?.length ?? 0;
  }
  return n;
}
