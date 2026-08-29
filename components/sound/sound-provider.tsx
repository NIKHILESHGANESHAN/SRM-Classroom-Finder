"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import {
  getSoundEngine,
  playSound as playSoundGlobal,
  type SoundType,
} from "@/lib/sound-effects";

type SoundContextValue = {
  enabled: boolean;
  canPlay: boolean;
  play: (type: SoundType) => void;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

function isUserActivationEvent(event: Event): boolean {
  return (
    event.type === "pointerdown" ||
    event.type === "keydown" ||
    event.type === "touchstart"
  );
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const engineRef = useRef(getSoundEngine());
  const [enabled, setEnabledState] = useState(() => engineRef.current.isEnabled());
  const [unlocked, setUnlocked] = useState(() => engineRef.current.isUnlocked());

  useEffect(() => {
    engineRef.current.setReducedMotion(Boolean(reduceMotion));
    setEnabledState(engineRef.current.isEnabled());
  }, [reduceMotion]);

  useEffect(() => {
    const engine = engineRef.current;

    async function onActivation(event: Event) {
      if (!isUserActivationEvent(event)) return;
      const ok = await engine.unlock();
      if (ok) setUnlocked(true);
    }

    window.addEventListener("pointerdown", onActivation, { passive: true });
    window.addEventListener("keydown", onActivation);
    window.addEventListener("touchstart", onActivation, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onActivation);
      window.removeEventListener("keydown", onActivation);
      window.removeEventListener("touchstart", onActivation);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    engineRef.current.setEnabled(next, true);
    setEnabledState(engineRef.current.isEnabled());
    if (next) {
      void engineRef.current.unlock().then((ok) => {
        if (ok) setUnlocked(true);
      });
    }
  }, []);

  const toggle = useCallback(() => {
    const next = engineRef.current.toggleEnabled();
    setEnabledState(engineRef.current.isEnabled());
    if (next) {
      void engineRef.current.unlock().then((ok) => {
        if (ok) setUnlocked(true);
      });
    }
    return next;
  }, []);

  const play = useCallback((type: SoundType) => {
    playSoundGlobal(type);
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({
      enabled,
      canPlay: enabled && unlocked,
      play,
      setEnabled,
      toggle,
    }),
    [enabled, unlocked, play, setEnabled, toggle],
  );

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used within SoundProvider");
  }
  return ctx;
}
