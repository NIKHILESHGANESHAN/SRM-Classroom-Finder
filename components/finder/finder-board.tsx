"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { ClassroomCard } from "@/components/finder/classroom-card";
import { FinderEmptyState } from "@/components/finder/finder-empty-state";
import { FinderFiltersBar } from "@/components/finder/finder-filters";
import { FinderLiveStatus } from "@/components/finder/finder-live-status";
import { FinderMorningNote } from "@/components/finder/finder-morning-note";
import { FinderRecentRooms } from "@/components/finder/finder-recent-rooms";
import { HowItWorksLink } from "@/components/how-it-works-link";
import { GlassNavigation } from "@/components/glass";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { glassSurfaceClasses } from "@/lib/glass";
import { PRODUCT_NAME } from "@/lib/design-tokens";
import { useFinderPoll } from "@/hooks/use-finder-poll";
import {
  useFavoriteBuildings,
  useRecentRooms,
} from "@/hooks/use-local-preferences";
import type { FinderDeepLink, FinderPageData } from "@/lib/finder-data";
import {
  applyFinderFocus,
  applyRoomSearch,
  filterRoomsForActiveCycle,
  resolveFinderEmptyReason,
  type FinderFocus,
} from "@/lib/finder-realtime";
import { prioritizeFavoriteBuildings } from "@/lib/local-preferences";
import { shouldShowFinderMorningNote } from "@/lib/finder-morning-note-logic";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 200;

type FinderBoardProps = {
  data: FinderPageData;
  focus: FinderFocus;
  deepLink: FinderDeepLink | null;
};

/**
 * Class Finder client shell: debounced room search + layout-animated list.
 * Building / floor / slot / focus filters hit the server via URL searchParams
 * (focus is applied client-side on the polled room list).
 * Local `hiddenIds` lets 2-strike reports collapse cards without a full reload.
 */
export function FinderBoard({ data, focus, deepLink }: FinderBoardProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [mineOnly, setMineOnly] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rememberedLink = useRef(false);

  const allowedCodes = useMemo(
    () => data.buildings.map((b) => b.code),
    [data.buildings],
  );
  const { favoriteCodes, toggleFavorite } = useFavoriteBuildings(allowedCodes);
  const { recentRooms, rememberRoom, clearRecentRooms } = useRecentRooms();

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
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (rememberedLink.current || !deepLink?.inventoryOk) return;
    const building = data.buildings.find((b) => b.id === data.applied.buildingId);
    const floor = building?.floors.find((f) => f.id === data.applied.floorId);
    if (!building || !floor) return;
    rememberedLink.current = true;
    rememberRoom({
      buildingCode: building.code,
      floorNumber: floor.floorNumber,
      roomNumber: deepLink.roomNumber,
    });
  }, [deepLink, data.applied, data.buildings, rememberRoom]);

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

  const matchesDeepLink = useCallback(
    (room: (typeof rooms)[number]) => {
      if (!deepLink?.inventoryOk) return false;
      return (
        room.roomNumber === deepLink.roomNumber &&
        room.buildingCode === deepLink.buildingLabel &&
        `Floor ${room.floorNumber}` === deepLink.floorLabel
      );
    },
    [deepLink],
  );

  const roomPipeline = useMemo(() => {
    const nowMs = Date.now();
    const cycleScoped = filterRoomsForActiveCycle(rooms);
    const withoutHidden = cycleScoped.filter((r) => !hiddenIds.has(r.freeReportId));
    const scoped = mineOnly
      ? withoutHidden.filter((r) => favoriteCodes.includes(r.buildingCode))
      : withoutHidden;
    const focused = applyFinderFocus(scoped, focus, nowMs);
    const searched = applyRoomSearch(focused, deferredSearch);
    const visible = prioritizeFavoriteBuildings(
      searched,
      mineOnly ? [] : favoriteCodes,
    );
    return { withoutHidden, scoped, focused, visible };
  }, [
    rooms,
    deferredSearch,
    hiddenIds,
    focus,
    mineOnly,
    favoriteCodes,
  ]);

  const visibleRooms = roomPipeline.visible;
  const withoutHiddenCount = roomPipeline.withoutHidden.length;

  const emptyReason = useMemo(() => {
    const myBuildingsEmpty =
      mineOnly &&
      (favoriteCodes.length === 0 ||
        (roomPipeline.withoutHidden.length > 0 &&
          roomPipeline.scoped.length === 0));
    return resolveFinderEmptyReason({
      searchQuery: deferredSearch,
      focus,
      roomsFromServer: roomPipeline.withoutHidden.length,
      roomsAfterFocus: roomPipeline.focused.length,
      roomsAfterSearch: visibleRooms.length,
      coverageKind: coverage.kind,
      myBuildingsEmpty,
    });
  }, [
    roomPipeline,
    focus,
    deferredSearch,
    visibleRooms.length,
    coverage.kind,
    mineOnly,
    favoriteCodes,
  ]);

  const sharedIsFree = rooms.some(matchesDeepLink);

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

  const showMorningNote = shouldShowFinderMorningNote({
    visibleRoomCount: withoutHiddenCount,
    hasSearch: Boolean(deferredSearch),
    mineOnly,
  });

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-3 overflow-x-hidden sm:max-w-2xl sm:gap-5"
      data-search={debouncedSearch}
      data-result-count={visibleRooms.length}
      data-focus={focus}
    >
      <GlassNavigation
        aria-label="Finder navigation"
        className="relative z-20 flex items-center gap-2 px-2 py-2 sm:px-3"
      >
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" asChild>
          <Link href="/" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
            {PRODUCT_NAME}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {isCurrentSlot ? "Free right now" : "Browse slots"} · {slotLabel}
          </p>
        </div>
        <MoreOptionsMenu className="shrink-0" />
      </GlassNavigation>

      <FinderFiltersBar
        buildings={data.buildings}
        timeSlots={data.timeSlots}
        currentSlotId={currentSlotId}
        applied={data.applied}
        focus={focus}
        favoriteCodes={favoriteCodes}
        onToggleFavorite={toggleFavorite}
        mineOnly={mineOnly}
        onMineOnlyChange={setMineOnly}
      />

      <div className="relative">
        <label htmlFor="room-search" className="sr-only">
          Search by room number
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="room-search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Room number — e.g. 1205"
          className={cn(
            "min-h-11 rounded-control border-0 pl-9 text-base shadow-none",
            glassSurfaceClasses({ variant: "clear" }),
          )}
          autoComplete="off"
          inputMode="search"
        />
      </div>

      <FinderRecentRooms rooms={recentRooms} onClear={clearRecentRooms} />

      {deepLink && !deepLink.inventoryOk ? (
        <p
          role="status"
          className="rounded-surface border border-border bg-muted/50 px-3 py-3 text-sm"
        >
          This link doesn&apos;t match a listed classroom for {deepLink.buildingLabel}{" "}
          {deepLink.floorLabel}.
        </p>
      ) : null}

      {deepLink?.inventoryOk && !sharedIsFree ? (
        <p
          role="status"
          className="rounded-surface border border-border bg-muted/50 px-3 py-3 text-sm"
        >
          {deepLink.buildingLabel} {deepLink.roomNumber} isn&apos;t reported free
          right now.
        </p>
      ) : null}

      <FinderMorningNote
        totalActiveReports={withoutHiddenCount}
        show={showMorningNote}
      />

      <FinderLiveStatus
        lastUpdatedAt={lastUpdatedAt}
        refreshing={refreshing}
        onRefresh={() => {
          void refreshNow();
        }}
      />

      {refreshError ? (
        <p role="status" className="text-sm text-muted-foreground">
          {refreshError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p className="text-muted-foreground">
          {visibleRooms.length} room{visibleRooms.length === 1 ? "" : "s"}
          {deferredSearch
            ? ` matching “${deferredSearch}”`
            : searchInput
              ? "…"
              : ""}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <HowItWorksLink />
          <Link
            href="/contribute"
            className="inline-flex min-h-11 items-center font-medium text-cf-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Report a room
          </Link>
        </div>
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
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="sync">
            {visibleRooms.map((room) => (
              <ClassroomCard
                key={room.freeReportId}
                room={room}
                index={0}
                onRemove={handleRemove}
                onNeedRefresh={refreshNow}
                emphasized={matchesDeepLink(room)}
                onShared={rememberRoom}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
