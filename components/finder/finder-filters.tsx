"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FinderBuilding, FinderSlot } from "@/lib/finder-data";
import {
  buildFinderQuery,
  type FinderFocus,
} from "@/lib/finder-realtime";
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
  focus: FinderFocus;
  favoriteCodes: readonly string[];
  onToggleFavorite: (code: string) => void;
  mineOnly: boolean;
  onMineOnlyChange: (value: boolean) => void;
};

const FOCUS_OPTIONS: { value: FinderFocus; label: string }[] = [
  { value: "all", label: "All free" },
  { value: "recent", label: "Recently reported" },
  { value: "ending", label: "Ending soon" },
];

export function FinderFiltersBar({
  buildings,
  timeSlots,
  currentSlotId,
  applied,
  focus,
  favoriteCodes,
  onToggleFavorite,
  mineOnly,
  onMineOnlyChange,
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

  const orderedBuildings = useMemo(() => {
    const fav = new Set(favoriteCodes);
    return [...buildings].sort((a, b) => {
      const da = fav.has(a.code) ? 0 : 1;
      const db = fav.has(b.code) ? 0 : 1;
      if (da !== db) return da - db;
      return a.code.localeCompare(b.code);
    });
  }, [buildings, favoriteCodes]);

  function navigate(next: {
    buildingId: string | null;
    floorId: string | null;
    timeSlotId: string | null;
    focus: FinderFocus;
  }) {
    const href = `${pathname}${buildFinderQuery({
      ...next,
      currentSlotId,
    })}`;
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
                focus,
              });
            }}
          >
            <SelectTrigger id="finder-building" className="min-h-11">
              <SelectValue placeholder="All buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buildings</SelectItem>
              {orderedBuildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {favoriteCodes.includes(b.code) ? "★ " : ""}
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
                focus,
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
                focus,
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

      <div className="space-y-1.5">
        <p id="finder-favorites-label" className="text-xs text-muted-foreground">
          My buildings
        </p>
        <p className="text-xs text-muted-foreground">
          Saved on this device only. Other buildings stay visible unless you
          choose My buildings.
        </p>
        <div
          role="group"
          aria-labelledby="finder-favorites-label"
          className="flex flex-wrap gap-2"
        >
          {buildings.map((b) => {
            const favorited = favoriteCodes.includes(b.code);
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={favorited}
                aria-label={
                  favorited
                    ? `${b.code} — Favorited`
                    : `Add ${b.code} to My buildings`
                }
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  favorited
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/60",
                )}
                onClick={() => onToggleFavorite(b.code)}
              >
                <Star
                  className="h-4 w-4"
                  aria-hidden
                  fill={favorited ? "currentColor" : "none"}
                />
                {b.code}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={mineOnly}
            className={cn(
              "inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              mineOnly
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted/60",
            )}
            onClick={() => onMineOnlyChange(!mineOnly)}
          >
            Show My buildings
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p id="finder-focus-label" className="text-xs text-muted-foreground">
          List focus
        </p>
        <div
          role="group"
          aria-labelledby="finder-focus-label"
          className="grid grid-cols-3 gap-2"
        >
          {FOCUS_OPTIONS.map((option) => {
            const selected = focus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "min-h-11 rounded-xl border px-2 text-xs font-medium sm:text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/60",
                )}
                onClick={() =>
                  navigate({
                    buildingId: applied.buildingId,
                    floorId: applied.floorId,
                    timeSlotId: applied.timeSlotId,
                    focus: option.value,
                  })
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
