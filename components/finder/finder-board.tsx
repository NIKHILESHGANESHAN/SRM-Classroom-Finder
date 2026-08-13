"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { ClassroomCard } from "@/components/finder/classroom-card";
import { FinderEmptyState } from "@/components/finder/finder-empty-state";
import { FinderFiltersBar } from "@/components/finder/finder-filters";
import { FinderLiveStatus } from "@/components/finder/finder-live-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFinderPoll } from "@/hooks/use-finder-poll";
import type { FinderPageData } from "@/lib/finder-data";
import {
  applyFinderFocus,
  applyRoomSearch,
  resolveFinderEmptyReason,
  type FinderFocus,
} from "@/lib/finder-realtime";

const SEARCH_DEBOUNCE_MS = 200;

type FinderBoardProps = {
  data: FinderPageData;
  focus: FinderFocus;
};

/**
 * Class Finder client shell: debounced room search + layout-animated list.
 * Building / floor / slot / focus filters hit the server via URL searchParams
 * (focus is applied client-side on the polled room list).
 * Local `hiddenIds` lets 2-strike reports collapse cards without a full reload.
 */
export function FinderBoard({ data, focus }: FinderBoardProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [listReady, setListReady] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    rooms,
    coverage,
    currentSlotId,
    lastUpdatedAt,
    refreshing,
    refreshError,
    announcement,
    refreshNow,
  } = useFinderPoll({
    initialRooms: data.rooms,
    initialCoverage: data.coverage,
    initialCurrentSlotId: data.currentSlotId,
    applied: data.applied,
  });

  const appliedKey = `${data.applied.buildingId ?? ""}|${data.applied.floorId ?? ""}|${data.applied.timeSlotId ?? "all"}`;

  useEffect(() => {
    setHiddenIds(new Set());
  }, [appliedKey]);

  useEffect(() => {
    setListReady(true);
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    setHiddenIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(rooms.map((r) => r.freeReportId));
      const next = new Set<string>();
      let changed = false;
      for (const id of Array.from(prev)) {
        if (live.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rooms]);

  function handleSearchChange(raw: string) {
    setSearchInput(raw);
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(raw.trim());
    }, SEARCH_DEBOUNCE_MS);
  }

  const handleRemove = useCallback((freeReportId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(freeReportId);
      return next;
    });
  }, []);

  const deferredSearch = useDeferredValue(debouncedSearch);

  const visibleRooms = useMemo(() => {
    const nowMs = Date.now();
    const withoutHidden = rooms.filter((r) => !hiddenIds.has(r.freeReportId));
    const focused = applyFinderFocus(withoutHidden, focus, nowMs);
    return applyRoomSearch(focused, deferredSearch);
  }, [rooms, deferredSearch, hiddenIds, focus]);

  const emptyReason = useMemo(() => {
    const nowMs = Date.now();
    const withoutHidden = rooms.filter((r) => !hiddenIds.has(r.freeReportId));
    const focused = applyFinderFocus(withoutHidden, focus, nowMs);
    return resolveFinderEmptyReason({
      searchQuery: deferredSearch,
      focus,
      roomsFromServer: withoutHidden.length,
      roomsAfterFocus: focused.length,
      roomsAfterSearch: visibleRooms.length,
      coverageKind: coverage.kind,
    });
  }, [rooms, hiddenIds, focus, deferredSearch, visibleRooms.length, coverage.kind]);

  const slotLabel = useMemo(() => {
    if (!data.applied.timeSlotId) return "all slots";
    const slot = data.timeSlots.find((s) => s.id === data.applied.timeSlotId);
    if (!slot) return "this slot";
    const nowTag = slot.id === currentSlotId ? " (now)" : "";
    return `Slot ${slot.slotOrder}${nowTag} · ${slot.rangeLabel}`;
  }, [data.applied.timeSlotId, data.timeSlots, currentSlotId]);

  const isCurrentSlot =
    data.applied.timeSlotId !== null &&
    data.applied.timeSlotId === currentSlotId;

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6"
      data-search={debouncedSearch}
      data-result-count={visibleRooms.length}
      data-focus={focus}
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
        currentSlotId={currentSlotId}
        applied={data.applied}
        focus={focus}
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

      <FinderLiveStatus
        lastUpdatedAt={lastUpdatedAt}
        refreshing={refreshing}
        onRefresh={() => {
          void refreshNow();
        }}
      />

      {refreshError ? (
        <p role="status" className="text-xs text-muted-foreground">
          {refreshError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {visibleRooms.length} room{visibleRooms.length === 1 ? "" : "s"}
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

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {visibleRooms.length === 0 ? (
        <FinderEmptyState
          slotLabel={
            deferredSearch
              ? `“${deferredSearch}” in ${slotLabel}`
              : slotLabel
          }
          reason={emptyReason ?? "none_free"}
        />
      ) : (
        <LayoutGroup>
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {visibleRooms.map((room, index) => (
                <ClassroomCard
                  key={room.freeReportId}
                  room={room}
                  index={listReady ? 0 : index}
                  onRemove={handleRemove}
                  onNeedRefresh={refreshNow}
                />
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      )}
    </div>
  );
}
