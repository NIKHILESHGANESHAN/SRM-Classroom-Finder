"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { ClassroomCard } from "@/components/finder/classroom-card";
import { FinderEmptyState } from "@/components/finder/finder-empty-state";
import { FinderFiltersBar } from "@/components/finder/finder-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FinderPageData } from "@/lib/finder-data";

const SEARCH_DEBOUNCE_MS = 200;

type FinderBoardProps = {
  data: FinderPageData;
};

/**
 * Class Finder client shell: debounced room search + layout-animated list.
 * Building / floor / slot filters hit the server via URL searchParams.
 * Local `hiddenIds` lets 2-strike reports collapse cards without a full reload.
 */
export function FinderBoard({ data }: FinderBoardProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset local hides when server payload / filters change
  useEffect(() => {
    setHiddenIds(new Set());
  }, [data.rooms]);

  function handleSearchChange(raw: string) {
    setSearchInput(raw);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(raw.trim());
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleRemove(freeReportId: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(freeReportId);
      return next;
    });
  }

  const deferredSearch = useDeferredValue(debouncedSearch);

  const filteredRooms = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return data.rooms.filter((r) => {
      if (hiddenIds.has(r.freeReportId)) return false;
      if (!q) return true;
      return r.roomNumber.toLowerCase().includes(q);
    });
  }, [data.rooms, deferredSearch, hiddenIds]);

  const slotLabel = useMemo(() => {
    if (!data.applied.timeSlotId) return "all slots";
    const slot = data.timeSlots.find((s) => s.id === data.applied.timeSlotId);
    if (!slot) return "this slot";
    const nowTag = slot.id === data.currentSlotId ? " (now)" : "";
    return `Slot ${slot.slotOrder}${nowTag} · ${slot.rangeLabel}`;
  }, [data.applied.timeSlotId, data.timeSlots, data.currentSlotId]);

  const isCurrentSlot =
    data.applied.timeSlotId !== null &&
    data.applied.timeSlotId === data.currentSlotId;

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
      data-search={debouncedSearch}
      data-result-count={filteredRooms.length}
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" asChild>
          <Link href="/" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Class Finder
          </h1>
          <p className="text-sm text-muted-foreground">
            {isCurrentSlot ? "Free right now" : "Browsing slots"} · {slotLabel}
          </p>
        </div>
      </div>

      <FinderFiltersBar
        buildings={data.buildings}
        timeSlots={data.timeSlots}
        currentSlotId={data.currentSlotId}
        applied={data.applied}
      />

      <div className="relative">
        <label htmlFor="room-search" className="sr-only">
          Quick search room number
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="room-search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Quick search — e.g. 504"
          className="min-h-11 pl-9 text-base"
          autoComplete="off"
          inputMode="search"
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <p aria-live="polite">
          {filteredRooms.length} room{filteredRooms.length === 1 ? "" : "s"}
          {deferredSearch
            ? ` matching “${deferredSearch}”`
            : searchInput
              ? "…"
              : ""}
        </p>
        <Link
          href="/contribute"
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Report a room
        </Link>
      </div>

      {filteredRooms.length === 0 ? (
        <FinderEmptyState
          slotLabel={
            deferredSearch
              ? `“${deferredSearch}” in ${slotLabel}`
              : slotLabel
          }
          coverageKind={data.coverage.kind}
          searchMiss={Boolean(deferredSearch) && data.rooms.length > 0}
        />
      ) : (
        <LayoutGroup>
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filteredRooms.map((room, index) => (
                <ClassroomCard
                  key={room.freeReportId}
                  room={room}
                  index={index}
                  onRemove={handleRemove}
                />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}
