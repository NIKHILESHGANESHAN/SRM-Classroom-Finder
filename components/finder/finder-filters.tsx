"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FinderBuilding, FinderSlot } from "@/lib/finder-data";
import { cn } from "@/lib/utils";

type FinderFiltersBarProps = {
  buildings: FinderBuilding[];
  timeSlots: FinderSlot[];
  currentSlotId: string | null;
  applied: {
    buildingId: string | null;
    floorId: string | null;
    timeSlotId: string | null;
  };
};

function buildQuery(params: {
  buildingId: string | null;
  floorId: string | null;
  timeSlotId: string | null;
  currentSlotId: string | null;
}): string {
  const q = new URLSearchParams();
  if (params.buildingId) q.set("building", params.buildingId);
  if (params.floorId) q.set("floor", params.floorId);
  // Omit slot when it equals current → clean “Free Right Now” URL
  if (params.timeSlotId && params.timeSlotId !== params.currentSlotId) {
    q.set("slot", params.timeSlotId);
  }
  if (params.timeSlotId === null) {
    q.set("slot", "all");
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function FinderFiltersBar({
  buildings,
  timeSlots,
  currentSlotId,
  applied,
}: FinderFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const floors = useMemo(() => {
    if (!applied.buildingId) return [];
    return (
      buildings.find((b) => b.id === applied.buildingId)?.floors ?? []
    );
  }, [buildings, applied.buildingId]);

  function navigate(next: {
    buildingId: string | null;
    floorId: string | null;
    timeSlotId: string | null;
  }) {
    const href = `${pathname}${buildQuery({ ...next, currentSlotId })}`;
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5",
        pending && "opacity-80",
      )}
      aria-busy={pending}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="finder-building"
            className="text-xs text-muted-foreground"
          >
            Building
          </Label>
          <Select
            value={applied.buildingId ?? "all"}
            onValueChange={(value) => {
              const buildingId = value === "all" ? null : value;
              navigate({
                buildingId,
                floorId: null,
                timeSlotId: applied.timeSlotId,
              });
            }}
          >
            <SelectTrigger id="finder-building" className="min-h-11">
              <SelectValue placeholder="All buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buildings</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="finder-floor"
            className="text-xs text-muted-foreground"
          >
            Floor
          </Label>
          <Select
            value={applied.floorId ?? "all"}
            disabled={!applied.buildingId}
            onValueChange={(value) => {
              navigate({
                buildingId: applied.buildingId,
                floorId: value === "all" ? null : value,
                timeSlotId: applied.timeSlotId,
              });
            }}
          >
            <SelectTrigger id="finder-floor" className="min-h-11">
              <SelectValue
                placeholder={
                  applied.buildingId ? "All floors" : "Pick a building first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All floors</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  Floor {f.floorNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="finder-slot"
            className="text-xs text-muted-foreground"
          >
            Time slot
          </Label>
          <Select
            value={applied.timeSlotId ?? "all"}
            onValueChange={(value) => {
              navigate({
                buildingId: applied.buildingId,
                floorId: applied.floorId,
                timeSlotId: value === "all" ? null : value,
              });
            }}
          >
            <SelectTrigger id="finder-slot" className="min-h-11">
              <SelectValue placeholder="Current slot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All slots</SelectItem>
              {timeSlots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Slot {s.slotOrder}
                  {s.id === currentSlotId ? " · Now" : ""} — {s.rangeLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
