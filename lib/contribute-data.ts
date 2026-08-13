import { prisma } from "@/lib/prisma";
import {
  formatSlotRangeLabel,
  getCurrentSlotId,
  getNowMinutesInTz,
  isSlotSelectable,
  timeToMinutes,
  type SlotTimeFields,
} from "@/lib/slots";

export type ClassroomOption = {
  id: string;
  roomNumber: string;
};

export type BuildingOption = {
  id: string;
  code: string;
  name: string;
  floors: {
    id: string;
    floorNumber: number;
    classrooms: ClassroomOption[];
  }[];
};

export type TimeSlotOption = {
  id: string;
  slotOrder: number;
  startMinutes: number;
  endMinutes: number;
  label: string;
  rangeLabel: string;
  selectable: boolean;
};

export type ContributePageData = {
  buildings: BuildingOption[];
  timeSlots: TimeSlotOption[];
  currentSlotId: string | null;
  nowMinutes: number;
};

/** Load dimension data for the Contributor wizard (Server Component). */
export async function getContributePageData(): Promise<ContributePageData> {
  const [buildings, slots] = await Promise.all([
    prisma.building.findMany({
      orderBy: { code: "asc" },
      include: {
        floors: {
          orderBy: { floorNumber: "asc" },
          select: {
            id: true,
            floorNumber: true,
            classrooms: {
              where: { isActive: true },
              orderBy: { roomNumber: "asc" },
              select: { id: true, roomNumber: true },
            },
          },
        },
      },
    }),
    prisma.timeSlot.findMany({
      orderBy: { slotOrder: "asc" },
    }),
  ]);

  const nowMinutes = getNowMinutesInTz();

  const slotFields: SlotTimeFields[] = slots.map((s) => ({
    id: s.id,
    slotOrder: s.slotOrder,
    startMinutes: timeToMinutes(s.startTime),
    endMinutes: timeToMinutes(s.endTime),
  }));

  const timeSlots: TimeSlotOption[] = slotFields.map((s) => ({
    id: s.id,
    slotOrder: s.slotOrder,
    startMinutes: s.startMinutes,
    endMinutes: s.endMinutes,
    label: `Slot ${s.slotOrder}`,
    rangeLabel: formatSlotRangeLabel(s.startMinutes, s.endMinutes),
    selectable: isSlotSelectable(s, nowMinutes),
  }));

  return {
    buildings: buildings.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      floors: b.floors.map((f) => ({
        id: f.id,
        floorNumber: f.floorNumber,
        classrooms: f.classrooms,
      })),
    })),
    timeSlots,
    currentSlotId: getCurrentSlotId(slotFields, nowMinutes),
    nowMinutes,
  };
}
