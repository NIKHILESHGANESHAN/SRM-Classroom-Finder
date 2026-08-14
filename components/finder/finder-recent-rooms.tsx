"use client";

import Link from "next/link";
import { buildClassroomSharePath } from "@/lib/classroom-share";
import type { RecentRoom } from "@/lib/local-preferences";

type FinderRecentRoomsProps = {
  rooms: RecentRoom[];
  onClear: () => void;
};

export function FinderRecentRooms({ rooms, onClear }: FinderRecentRoomsProps) {
  if (rooms.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Recent rooms</p>
        <button
          type="button"
          className="min-h-11 rounded-md px-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onClear}
        >
          Clear history
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {rooms.map((room) => {
          const href = buildClassroomSharePath(room);
          const label = `${room.buildingCode} ${room.roomNumber}`;
          return (
            <li key={`${room.buildingCode}-${room.floorNumber}-${room.roomNumber}`}>
              <Link
                href={href}
                className="inline-flex min-h-11 items-center rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
                <span className="sr-only">
                  {` Floor ${room.floorNumber}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
