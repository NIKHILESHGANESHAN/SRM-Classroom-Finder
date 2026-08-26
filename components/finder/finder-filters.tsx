"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SlidersHorizontal, Star } from "lucide-react";
import { GlassControl, GlassSurface } from "@/components/glass";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
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

const FOCUS_OPTIONS: {
  value: FinderFocus;
  label: string;
  shortLabel: string;
}[] = [
  { value: "all", label: "All free", shortLabel: "All" },
  { value: "recent", label: "Recently reported", shortLabel: "Recent" },
  { value: "ending", label: "Ending soon", shortLabel: "Ending" },
];

type FilterControlsProps = FinderFiltersBarProps & {
  pending: boolean;
  navigate: (next: {
    buildingId: string | null;
    floorId: string | null;
    timeSlotId: string | null;
    focus: FinderFocus;
  }) => void;
  floors: { id: string; floorNumber: number }[];
  orderedBuildings: FinderBuilding[];
};

function FilterControls({
  buildings,
  timeSlots,
  currentSlotId,
  applied,
  focus,
  favoriteCodes,
  onToggleFavorite,
  mineOnly,
  onMineOnlyChange,
  pending,
  navigate,
  floors,
  orderedBuildings,
}: FilterControlsProps) {
  return (
    <div className={cn("space-y-4", pending && "opacity-80")} aria-busy={pending}>
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
            <SelectTrigger id="finder-building" className="min-h-11 rounded-control">
              <SelectValue placeholder="All buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buildings</SelectItem>
              {orderedBuildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {favoriteCodes.includes(b.code) ? "★ " : ""}
                  {b.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="finder-floor" className="text-xs text-muted-foreground">
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
            <SelectTrigger id="finder-floor" className="min-h-11 rounded-control">
              <SelectValue
                placeholder={
                  applied.buildingId ? "All floors" : "Pick a building"
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
          <Label htmlFor="finder-slot" className="text-xs text-muted-foreground">
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
            <SelectTrigger id="finder-slot" className="min-h-11 rounded-control">
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

      <div className="space-y-2">
        <p id="finder-focus-label" className="text-xs text-muted-foreground">
          Show
        </p>
        <div
          role="group"
          aria-labelledby="finder-focus-label"
          className="grid grid-cols-3 gap-2"
        >
          {FOCUS_OPTIONS.map((option) => {
            const selected = focus === option.value;
            return (
              <GlassControl
                key={option.value}
                variant="clear"
                size="default"
                active={selected}
                className="min-h-11 px-1 text-xs sm:text-sm"
                aria-pressed={selected}
                onClick={() =>
                  navigate({
                    buildingId: applied.buildingId,
                    floorId: applied.floorId,
                    timeSlotId: applied.timeSlotId,
                    focus: option.value,
                  })
                }
              >
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </GlassControl>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p id="finder-favorites-label" className="text-xs text-muted-foreground">
          My buildings
          <span className="font-normal"> · saved on this device</span>
        </p>
        <div
          role="group"
          aria-labelledby="finder-favorites-label"
          className="flex flex-wrap gap-2"
        >
          {buildings.map((b) => {
            const favorited = favoriteCodes.includes(b.code);
            return (
              <GlassControl
                key={b.id}
                variant="clear"
                size="default"
                active={favorited}
                className="gap-1.5 px-3"
                aria-pressed={favorited}
                aria-label={
                  favorited
                    ? `${b.code} — Favorited`
                    : `Add ${b.code} to My buildings`
                }
                onClick={() => onToggleFavorite(b.code)}
              >
                <Star
                  className="h-3.5 w-3.5"
                  aria-hidden
                  fill={favorited ? "currentColor" : "none"}
                />
                {b.code}
              </GlassControl>
            );
          })}
          <GlassControl
            variant="clear"
            size="default"
            active={mineOnly}
            className="px-3"
            aria-pressed={mineOnly}
            onClick={() => onMineOnlyChange(!mineOnly)}
          >
            My buildings only
          </GlassControl>
        </div>
      </div>
    </div>
  );
}

export function FinderFiltersBar(props: FinderFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const floors = useMemo(() => {
    if (!props.applied.buildingId) return [];
    return (
      props.buildings.find((b) => b.id === props.applied.buildingId)?.floors ??
      []
    );
  }, [props.buildings, props.applied.buildingId]);

  const orderedBuildings = useMemo(() => {
    const fav = new Set(props.favoriteCodes);
    return [...props.buildings].sort((a, b) => {
      const da = fav.has(a.code) ? 0 : 1;
      const db = fav.has(b.code) ? 0 : 1;
      if (da !== db) return da - db;
      return a.code.localeCompare(b.code);
    });
  }, [props.buildings, props.favoriteCodes]);

  function navigate(next: {
    buildingId: string | null;
    floorId: string | null;
    timeSlotId: string | null;
    focus: FinderFocus;
  }) {
    const href = `${pathname}${buildFinderQuery({
      ...next,
      currentSlotId: props.currentSlotId,
    })}`;
    startTransition(() => {
      router.push(href);
      setSheetOpen(false);
    });
  }

  const controls = (
    <FilterControls
      {...props}
      pending={pending}
      navigate={navigate}
      floors={floors}
      orderedBuildings={orderedBuildings}
    />
  );

  if (isDesktop) {
    return (
      <GlassSurface variant="regular" className="p-3 sm:p-4">
        {controls}
      </GlassSurface>
    );
  }

  const buildingLabel =
    props.applied.buildingId
      ? orderedBuildings.find((b) => b.id === props.applied.buildingId)?.code ??
        "Building"
      : "All buildings";

  return (
    <div className="space-y-3">
      <GlassSurface variant="regular" className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1.5">
            <Label
              htmlFor="finder-building-mobile"
              className="text-xs text-muted-foreground"
            >
              Building
            </Label>
            <Select
              value={props.applied.buildingId ?? "all"}
              onValueChange={(value) => {
                navigate({
                  buildingId: value === "all" ? null : value,
                  floorId: null,
                  timeSlotId: props.applied.timeSlotId,
                  focus: props.focus,
                });
              }}
            >
              <SelectTrigger
                id="finder-building-mobile"
                className="min-h-11 rounded-control"
              >
                <SelectValue placeholder="All buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buildings</SelectItem>
                {orderedBuildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {props.favoriteCodes.includes(b.code) ? "★ " : ""}
                    {b.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="finder-floor-mobile"
              className="text-xs text-muted-foreground"
            >
              Floor
            </Label>
            <Select
              value={props.applied.floorId ?? "all"}
              disabled={!props.applied.buildingId}
              onValueChange={(value) => {
                navigate({
                  buildingId: props.applied.buildingId,
                  floorId: value === "all" ? null : value,
                  timeSlotId: props.applied.timeSlotId,
                  focus: props.focus,
                });
              }}
            >
              <SelectTrigger
                id="finder-floor-mobile"
                className="min-h-11 rounded-control"
              >
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.floorNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="finder-slot-mobile"
              className="text-xs text-muted-foreground"
            >
              Slot
            </Label>
            <Select
              value={props.applied.timeSlotId ?? "all"}
              onValueChange={(value) => {
                navigate({
                  buildingId: props.applied.buildingId,
                  floorId: props.applied.floorId,
                  timeSlotId: value === "all" ? null : value,
                  focus: props.focus,
                });
              }}
            >
              <SelectTrigger
                id="finder-slot-mobile"
                className="min-h-11 rounded-control"
              >
                <SelectValue placeholder="Now" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {props.timeSlots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.slotOrder}
                    {s.id === props.currentSlotId ? " · Now" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {buildingLabel}
            {props.focus !== "all"
              ? ` · ${FOCUS_OPTIONS.find((o) => o.value === props.focus)?.shortLabel ?? props.focus}`
              : ""}
          </p>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <GlassControl
                variant="clear"
                size="default"
                className="min-h-11 shrink-0 gap-1.5 px-3"
                aria-label="My buildings filters"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                My buildings
              </GlassControl>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70dvh] rounded-t-sheet pb-8">
              <SheetHeader>
                <SheetTitle>My buildings</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Star buildings you use often. Saved on this device only.
                </p>
                <div
                  role="group"
                  aria-label="Favorite buildings"
                  className="flex flex-wrap gap-2"
                >
                  {props.buildings.map((b) => {
                    const favorited = props.favoriteCodes.includes(b.code);
                    return (
                      <GlassControl
                        key={b.id}
                        variant="clear"
                        size="default"
                        active={favorited}
                        className="gap-1.5 px-3"
                        aria-pressed={favorited}
                        onClick={() => props.onToggleFavorite(b.code)}
                      >
                        <Star
                          className="h-3.5 w-3.5"
                          aria-hidden
                          fill={favorited ? "currentColor" : "none"}
                        />
                        {b.code}
                      </GlassControl>
                    );
                  })}
                  <GlassControl
                    variant="clear"
                    size="default"
                    active={props.mineOnly}
                    className="px-3"
                    aria-pressed={props.mineOnly}
                    onClick={() => props.onMineOnlyChange(!props.mineOnly)}
                  >
                    Show my buildings only
                  </GlassControl>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </GlassSurface>

      <div
        role="group"
        aria-label="List focus"
        className="grid grid-cols-3 gap-2"
      >
        {FOCUS_OPTIONS.map((option) => {
          const selected = props.focus === option.value;
          return (
            <GlassControl
              key={option.value}
              variant="clear"
              size="default"
              active={selected}
              className="min-h-11 px-1 text-xs"
              aria-pressed={selected}
              onClick={() =>
                navigate({
                  buildingId: props.applied.buildingId,
                  floorId: props.applied.floorId,
                  timeSlotId: props.applied.timeSlotId,
                  focus: option.value,
                })
              }
            >
              {option.shortLabel}
            </GlassControl>
          );
        })}
      </div>
    </div>
  );
}
