import { prisma } from "@/lib/prisma";

export type ClassroomLookupResult =
  | {
      ok: true;
      classroom: {
        id: string;
        roomNumber: string;
        buildingId: string;
        floorId: string;
      };
    }
  | { ok: false; error: string };

/**
 * Building + floor + classroom must match an active inventory row.
 * Rejects UB Floor 12 + room 504 (that classroom lives on floor 5, or not at all).
 */
export async function lookupActiveClassroom(args: {
  buildingId: string;
  floorId: string;
  classroomId: string;
}): Promise<ClassroomLookupResult> {
  const classroomId = args.classroomId.trim();
  if (!classroomId) {
    return { ok: false, error: "Select a classroom from the list." };
  }

  const classroom = await prisma.classroom.findFirst({
    where: {
      id: classroomId,
      buildingId: args.buildingId,
      floorId: args.floorId,
      isActive: true,
    },
    select: {
      id: true,
      roomNumber: true,
      buildingId: true,
      floorId: true,
    },
  });

  if (!classroom) {
    return {
      ok: false,
      error:
        "That classroom is not in the inventory for the selected building and floor.",
    };
  }

  return { ok: true, classroom };
}

/** Same integrity rule using public place (code is resolved to IDs by caller). */
export async function lookupActiveClassroomByPlace(args: {
  buildingId: string;
  floorId: string;
  roomNumber: string;
}): Promise<ClassroomLookupResult> {
  const roomNumber = args.roomNumber.trim();
  if (!roomNumber) {
    return { ok: false, error: "Select a classroom from the list." };
  }

  const classroom = await prisma.classroom.findFirst({
    where: {
      buildingId: args.buildingId,
      floorId: args.floorId,
      roomNumber,
      isActive: true,
    },
    select: {
      id: true,
      roomNumber: true,
      buildingId: true,
      floorId: true,
    },
  });

  if (!classroom) {
    return {
      ok: false,
      error:
        "That classroom is not in the inventory for the selected building and floor.",
    };
  }

  return { ok: true, classroom };
}
