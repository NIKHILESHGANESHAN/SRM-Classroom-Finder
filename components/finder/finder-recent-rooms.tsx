"use client";

import { SoundLink } from "@/components/sound/sound-link";
import { useSound } from "@/components/sound/sound-provider";
import { buildClassroomSharePath } from "@/lib/classroom-share";
import { surfaceElevatedClasses } from "@/lib/glass";
import type { RecentRoom } from "@/lib/local-preferences";
import { cn } from "@/lib/utils";

type FinderRecentRoomsProps = {
  rooms: RecentRoom[];
  onClear: () => void;
};

export function FinderRecentRooms({ rooms, onClear }: FinderRecentRoomsProps) {
  const { play } = useSound();

  if (rooms.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Recent rooms</p>
        <button
          type="button"
          className="min-h-11 rounded-button px-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            play("click");
            onClear();
          }}
        >
          Clear
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {rooms.map((room) => {
          const href = buildClassroomSharePath(room);
          const label = `${room.buildingCode} ${room.roomNumber}`;
          return (
            <li key={`${room.buildingCode}-${room.floorNumber}-${room.roomNumber}`}>
              <SoundLink
                href={href}
                sound="select"
                className={cn(
                  surfaceElevatedClasses(),
                  "inline-flex min-h-11 items-center px-3 text-sm tabular-nums transition-standard hover:border-cf-accent/30 hover:text-cf-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {label}
                <span className="sr-only">{` Floor ${room.floorNumber}`}</span>
              </SoundLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
