"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FAVORITES_STORAGE_KEY,
  RECENT_ROOMS_STORAGE_KEY,
  parseFavoriteCodes,
  parseRecentRooms,
  pushRecentRoom,
  serializeFavoriteCodes,
  serializeRecentRooms,
  toggleFavoriteCode,
  type RecentRoom,
} from "@/lib/local-preferences";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota / private mode — personalization is optional.
  }
}

export function useFavoriteBuildings(allowedCodes: readonly string[]) {
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    setCodes(parseFavoriteCodes(readStorage(FAVORITES_STORAGE_KEY), allowedCodes));
  }, [allowedCodes]);

  const toggle = useCallback(
    (code: string) => {
      setCodes((prev) => {
        const next = toggleFavoriteCode(prev, code, allowedCodes);
        writeStorage(FAVORITES_STORAGE_KEY, serializeFavoriteCodes(next));
        return next;
      });
    },
    [allowedCodes],
  );

  return { favoriteCodes: codes, toggleFavorite: toggle };
}

export function useRecentRooms() {
  const [rooms, setRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    setRooms(parseRecentRooms(readStorage(RECENT_ROOMS_STORAGE_KEY)));
  }, []);

  const remember = useCallback((room: Omit<RecentRoom, "savedAt">) => {
    setRooms((prev) => {
      const next = pushRecentRoom(prev, room);
      writeStorage(RECENT_ROOMS_STORAGE_KEY, serializeRecentRooms(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRooms([]);
    writeStorage(RECENT_ROOMS_STORAGE_KEY, serializeRecentRooms([]));
  }, []);

  return { recentRooms: rooms, rememberRoom: remember, clearRecentRooms: clear };
}
