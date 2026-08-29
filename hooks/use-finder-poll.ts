"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveFreeClassroom,
  FinderCoverage,
} from "@/lib/finder-data";
import {
  buildFinderRefreshPath,
  createFinderPollController,
  diffFinderRooms,
  filterRoomsForActiveCycle,
  finderCoverageUnchanged,
  nextPollIntervalMs,
  roomsPayloadUnchanged,
  summarizeFinderDiff,
  type FinderAppliedFilters,
  type FinderPollController,
  type FinderRefreshPayload,
} from "@/lib/finder-realtime";
import { FINDER_REFRESH_FAILED_MESSAGE } from "@/lib/db-errors";
import { getActiveFinderReportDate } from "@/lib/easter-egg";

type UseFinderPollArgs = {
  initialRooms: ActiveFreeClassroom[];
  initialCoverage: FinderCoverage;
  initialCurrentSlotId: string | null;
  applied: FinderAppliedFilters;
};

type UseFinderPollResult = {
  rooms: ActiveFreeClassroom[];
  coverage: FinderCoverage;
  currentSlotId: string | null;
  lastUpdatedAt: number;
  refreshing: boolean;
  refreshError: string | null;
  announcement: string;
  refreshNow: () => Promise<void>;
};

async function fetchFinderRefresh(
  path: string,
  signal: AbortSignal,
): Promise<FinderRefreshPayload> {
  const response = await fetch(path, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`finder_refresh_${response.status}`);
  }
  const body = (await response.json()) as {
    ok?: boolean;
    rooms?: ActiveFreeClassroom[];
    coverage?: FinderCoverage;
    currentSlotId?: string | null;
    fetchedAt?: string;
  };
  if (!body.ok || !Array.isArray(body.rooms) || !body.coverage) {
    throw new Error("finder_refresh_invalid");
  }
  return {
    rooms: body.rooms,
    coverage: body.coverage,
    currentSlotId: body.currentSlotId ?? null,
    fetchedAt: body.fetchedAt ?? new Date().toISOString(),
  };
}

/**
 * Finder-only visibility-aware polling. Does not run on other pages.
 * Pauses when document.hidden; a single timer; overlapping requests skipped.
 */
export function useFinderPoll({
  initialRooms,
  initialCoverage,
  initialCurrentSlotId,
  applied,
}: UseFinderPollArgs): UseFinderPollResult {
  const [rooms, setRooms] = useState(() =>
    filterRoomsForActiveCycle(initialRooms),
  );
  const [coverage, setCoverage] = useState(initialCoverage);
  const [currentSlotId, setCurrentSlotId] = useState(initialCurrentSlotId);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const roomsRef = useRef(rooms);
  const appliedRef = useRef(applied);
  const currentSlotIdRef = useRef(currentSlotId);
  const controllerRef = useRef<FinderPollController | null>(null);
  const manualRefreshRef = useRef(false);

  roomsRef.current = rooms;
  appliedRef.current = applied;
  currentSlotIdRef.current = currentSlotId;

  const applyPayload = useCallback(
    (payload: FinderRefreshPayload, options?: { bumpTimestamp?: boolean }) => {
      const filtered = filterRoomsForActiveCycle(payload.rooms);
      const previous = roomsRef.current;
      if (roomsPayloadUnchanged(previous, filtered)) {
        setCoverage((prev) =>
          finderCoverageUnchanged(prev, payload.coverage)
            ? prev
            : payload.coverage,
        );
        if (payload.currentSlotId !== currentSlotIdRef.current) {
          setCurrentSlotId(payload.currentSlotId);
        }
        setRefreshError(null);
        if (options?.bumpTimestamp) {
          setLastUpdatedAt(Date.now());
        }
        return;
      }
      const diff = diffFinderRooms(previous, filtered);
      setRooms(filtered);
      setCoverage(payload.coverage);
      setCurrentSlotId(payload.currentSlotId);
      setLastUpdatedAt(Date.now());
      setRefreshError(null);
      const summary = summarizeFinderDiff(diff);
      if (summary) setAnnouncement(summary);
    },
    [],
  );

  const runFetch = useCallback(
    async (signal: AbortSignal) => {
      const showSpinner = manualRefreshRef.current;
      manualRefreshRef.current = false;
      const path = buildFinderRefreshPath({
        applied: appliedRef.current,
        currentSlotId: currentSlotIdRef.current,
      });
      if (showSpinner) setRefreshing(true);
      try {
        const payload = await fetchFinderRefresh(path, signal);
        if (signal.aborted) return;
        applyPayload(payload, { bumpTimestamp: showSpinner });
      } catch {
        if (signal.aborted) return;
        setRefreshError(FINDER_REFRESH_FAILED_MESSAGE);
      } finally {
        if (showSpinner) setRefreshing(false);
      }
    },
    [applyPayload],
  );

  const runFetchRef = useRef(runFetch);
  runFetchRef.current = runFetch;

  const appliedKey = `${applied.buildingId ?? ""}|${applied.floorId ?? ""}|${applied.timeSlotId ?? "all"}`;

  useEffect(() => {
    setRooms(filterRoomsForActiveCycle(initialRooms));
    setCoverage(initialCoverage);
    setCurrentSlotId(initialCurrentSlotId);
    setLastUpdatedAt(Date.now());
    setRefreshError(null);
    setAnnouncement("");
    // Filter identity only — ignore new SSR array refs (e.g. focus= URL change).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- appliedKey is the server-filter identity
  }, [appliedKey]);

  // Reconcile when the campus reporting day/cycle changes while Finder stays open.
  useEffect(() => {
    let activeDate = getActiveFinderReportDate();
    const id = window.setInterval(() => {
      const nextDate = getActiveFinderReportDate();
      if (nextDate === activeDate) return;
      activeDate = nextDate;
      setRooms((current) => filterRoomsForActiveCycle(current));
      void controllerRef.current?.refreshNow();
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const controller = createFinderPollController({
      fetchRooms: (signal) => runFetchRef.current(signal),
      getDelayMs: () =>
        nextPollIntervalMs(roomsRef.current, Date.now()),
      isHidden: () => document.hidden,
    });
    controllerRef.current = controller;
    controller.start();

    const onVisibility = () => {
      controller.handleVisibility(document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      controller.stop();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [appliedKey]);

  const refreshNow = useCallback(async () => {
    manualRefreshRef.current = true;
    await controllerRef.current?.refreshNow();
  }, []);

  return {
    rooms,
    coverage,
    currentSlotId,
    lastUpdatedAt,
    refreshing,
    refreshError,
    announcement,
    refreshNow,
  };
}
