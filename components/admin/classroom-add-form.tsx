"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClassroomFromInventory } from "@/lib/actions/admin";
import {
  buildInventoryExistingKey,
  getAddableRoomsForFloor,
  isFloorFullyListed,
} from "@/lib/admin/inventory-add";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminInventoryRow } from "@/lib/admin/data";
import { CLASSROOM_INVENTORY } from "@/prisma/data/classroom-inventory";

type Props = {
  existingRows: AdminInventoryRow[];
};

const BUILDING_OPTIONS = ["UB", "TP2"] as const;

export function ClassroomAddForm({ existingRows }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [buildingCode, setBuildingCode] =
    useState<(typeof BUILDING_OPTIONS)[number]>("UB");
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [roomNumber, setRoomNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existingKey = useMemo(
    () => buildInventoryExistingKey(existingRows),
    [existingRows],
  );

  const floorOptions = useMemo(() => {
    const floors = CLASSROOM_INVENTORY[buildingCode];
    return Object.keys(floors)
      .map(Number)
      .sort((a, b) => a - b);
  }, [buildingCode]);

  const floor = Number(floorNumber);
  const floorSelected = Number.isInteger(floor);

  const addableRooms = useMemo(() => {
    if (!floorSelected) return [];
    return getAddableRoomsForFloor(buildingCode, floor, existingKey);
  }, [buildingCode, floor, existingKey, floorSelected]);

  const floorFullyListed = useMemo(() => {
    if (!floorSelected) return false;
    return isFloorFullyListed(buildingCode, floor, existingKey);
  }, [buildingCode, floor, existingKey, floorSelected]);

  useEffect(() => {
    if (!floorSelected) {
      setRoomNumber("");
      return;
    }
    if (addableRooms.length === 0) {
      setRoomNumber("");
      return;
    }
    if (!addableRooms.includes(roomNumber)) {
      setRoomNumber(addableRooms[0]!);
    }
  }, [addableRooms, floorSelected, roomNumber]);

  const canSubmit =
    floorSelected && addableRooms.length > 0 && roomNumber.trim().length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!floorSelected) {
      setError("Choose a floor.");
      return;
    }
    if (addableRooms.length === 0) {
      setError("All official classrooms on this floor are already in inventory.");
      return;
    }
    start(async () => {
      const result = await createClassroomFromInventory({
        buildingCode,
        floorNumber: floor,
        roomNumber: roomNumber.trim(),
      });
      if (result.ok) {
        toast.success(`${buildingCode} ${roomNumber.trim()} added.`);
        setRoomNumber("");
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-surface border border-border bg-card p-4 shadow-token-sm sm:p-5"
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Add classroom</h2>
        <p className="text-sm text-muted-foreground">
          Add a verified classroom that is part of the official inventory but
          has not been added yet. UB and TP2 only — TP1 inventory is not yet
          available, so TP1 classrooms cannot be added here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="add-building">Building</Label>
          <Select
            value={buildingCode}
            onValueChange={(value) => {
              setBuildingCode(value as (typeof BUILDING_OPTIONS)[number]);
              setFloorNumber("");
              setRoomNumber("");
              setError(null);
            }}
          >
            <SelectTrigger id="add-building" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUILDING_OPTIONS.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-floor">Floor</Label>
          <Select
            value={floorNumber}
            onValueChange={(value) => {
              setFloorNumber(value);
              setRoomNumber("");
              setError(null);
            }}
          >
            <SelectTrigger id="add-floor" className="min-h-11">
              <SelectValue placeholder="Select floor" />
            </SelectTrigger>
            <SelectContent>
              {floorOptions.map((floorOption) => (
                <SelectItem key={floorOption} value={String(floorOption)}>
                  Floor {floorOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-room">Room</Label>
          {floorSelected ? (
            floorFullyListed ? (
              <p
                id="add-room"
                role="status"
                className="flex min-h-11 items-center rounded-control border border-border bg-muted/30 px-3 text-sm text-muted-foreground"
              >
                All official classrooms on this floor are already in inventory.
              </p>
            ) : (
              <Select value={roomNumber} onValueChange={setRoomNumber}>
                <SelectTrigger id="add-room" className="min-h-11">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {addableRooms.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <p
              id="add-room"
              className="flex min-h-11 items-center rounded-control border border-dashed border-border px-3 text-sm text-muted-foreground"
            >
              Select a floor to see available rooms.
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="btn-press min-h-11"
        disabled={pending || !canSubmit}
      >
        {pending ? "Adding…" : "Add classroom"}
      </Button>
    </form>
  );
}
