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
  nextPollIntervalMs,
  roomsPayloadUnchanged,
  summarizeFinderDiff,
  type FinderAppliedFilters,
  type FinderPollController,
  type FinderRefreshPayload,
} from "@/lib/finder-realtime";

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
  const [rooms, setRooms] = useState(initialRooms);
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

  roomsRef.current = rooms;
  appliedRef.current = applied;
  currentSlotIdRef.current = currentSlotId;

  const applyPayload = useCallback((payload: FinderRefreshPayload) => {
    const previous = roomsRef.current;
    if (roomsPayloadUnchanged(previous, payload.rooms)) {
      setCoverage(payload.coverage);
      setCurrentSlotId(payload.currentSlotId);
      setLastUpdatedAt(Date.now());
      setRefreshError(null);
      return;
    }
    const diff = diffFinderRooms(previous, payload.rooms);
    setRooms(payload.rooms);
    setCoverage(payload.coverage);
    setCurrentSlotId(payload.currentSlotId);
    setLastUpdatedAt(Date.now());
    setRefreshError(null);
    const summary = summarizeFinderDiff(diff);
    if (summary) setAnnouncement(summary);
  }, []);

  const runFetch = useCallback(
    async (signal: AbortSignal) => {
      const path = buildFinderRefreshPath({
        applied: appliedRef.current,
        currentSlotId: currentSlotIdRef.current,
      });
      setRefreshing(true);
      try {
        const payload = await fetchFinderRefresh(path, signal);
        if (signal.aborted) return;
        applyPayload(payload);
      } catch {
        if (signal.aborted) return;
        setRefreshError("Unable to refresh — showing recent data.");
      } finally {
        setRefreshing(false);
      }
    },
    [applyPayload],
  );

  const runFetchRef = useRef(runFetch);
  runFetchRef.current = runFetch;

  const appliedKey = `${applied.buildingId ?? ""}|${applied.floorId ?? ""}|${applied.timeSlotId ?? "all"}`;

  useEffect(() => {
    setRooms(initialRooms);
    setCoverage(initialCoverage);
    setCurrentSlotId(initialCurrentSlotId);
    setLastUpdatedAt(Date.now());
    setRefreshError(null);
    setAnnouncement("");
    // Filter identity only — ignore new SSR array refs (e.g. focus= URL change).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- appliedKey is the server-filter identity
  }, [appliedKey]);

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
