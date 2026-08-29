/**
 * ClassFinder V5 Phase 4 — lightweight UI sound synthesis.
 * Web Audio API only; no audio assets or external libraries.
 */

export const SOUND_STORAGE_KEY = "classfinder-sound-enabled";

export const SOUND_TYPES = [
  "click",
  "success",
  "error",
  "open",
  "close",
  "select",
  "notification",
  "gameMove",
  "gameWin",
  "gameLose",
  "gameDraw",
] as const;

export type SoundType = (typeof SOUND_TYPES)[number];

export const XO_SOUND_EVENTS = {
  mark: "gameMove",
  computerMark: "gameMove",
  playerWin: "gameWin",
  computerWin: "gameLose",
  draw: "gameDraw",
  newGame: "click",
  open: "open",
  close: "close",
} as const satisfies Record<string, SoundType>;

type ToneStep = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

type SoundRecipe = {
  masterGain: number;
  tones: ToneStep[];
};

const SOUND_RECIPES: Record<SoundType, SoundRecipe> = {
  click: {
    masterGain: 0.08,
    tones: [{ frequency: 880, duration: 0.028, type: "sine", gain: 1 }],
  },
  select: {
    masterGain: 0.07,
    tones: [{ frequency: 720, duration: 0.024, type: "triangle", gain: 1 }],
  },
  open: {
    masterGain: 0.09,
    tones: [
      { frequency: 520, duration: 0.05, type: "sine", gain: 0.7 },
      { frequency: 780, duration: 0.06, type: "sine", gain: 1, delay: 0.04 },
    ],
  },
  close: {
    masterGain: 0.08,
    tones: [
      { frequency: 700, duration: 0.05, type: "sine", gain: 0.8 },
      { frequency: 420, duration: 0.07, type: "sine", gain: 1, delay: 0.035 },
    ],
  },
  success: {
    masterGain: 0.1,
    tones: [
      { frequency: 523, duration: 0.07, type: "sine", gain: 0.8 },
      { frequency: 659, duration: 0.09, type: "sine", gain: 1, delay: 0.06 },
      { frequency: 784, duration: 0.1, type: "sine", gain: 0.9, delay: 0.12 },
    ],
  },
  error: {
    masterGain: 0.09,
    tones: [
      { frequency: 220, duration: 0.09, type: "triangle", gain: 1 },
      { frequency: 165, duration: 0.11, type: "triangle", gain: 0.85, delay: 0.07 },
    ],
  },
  notification: {
    masterGain: 0.085,
    tones: [
      { frequency: 600, duration: 0.06, type: "sine", gain: 0.75 },
      { frequency: 900, duration: 0.07, type: "sine", gain: 1, delay: 0.05 },
    ],
  },
  gameMove: {
    masterGain: 0.085,
    tones: [{ frequency: 640, duration: 0.03, type: "sine", gain: 1 }],
  },
  gameWin: {
    masterGain: 0.11,
    tones: [
      { frequency: 523, duration: 0.08, type: "sine", gain: 0.8 },
      { frequency: 659, duration: 0.09, type: "sine", gain: 1, delay: 0.07 },
      { frequency: 784, duration: 0.12, type: "sine", gain: 0.95, delay: 0.14 },
    ],
  },
  gameLose: {
    masterGain: 0.085,
    tones: [
      { frequency: 330, duration: 0.09, type: "triangle", gain: 1 },
      { frequency: 247, duration: 0.12, type: "triangle", gain: 0.8, delay: 0.08 },
    ],
  },
  gameDraw: {
    masterGain: 0.08,
    tones: [
      { frequency: 440, duration: 0.08, type: "sine", gain: 0.9 },
      { frequency: 440, duration: 0.08, type: "sine", gain: 0.7, delay: 0.09 },
    ],
  },
};

export function isSoundType(value: unknown): value is SoundType {
  return (
    typeof value === "string" &&
    (SOUND_TYPES as readonly string[]).includes(value)
  );
}

export function readSoundPreference(
  storage: Pick<Storage, "getItem"> | null | undefined,
): boolean | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SOUND_STORAGE_KEY);
    if (raw === null) return null;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeSoundPreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  enabled: boolean,
): void {
  if (!storage) return;
  try {
    storage.setItem(SOUND_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    /* private mode / quota */
  }
}

export function prefersReducedSensoryEffects(
  mediaQueryList?: Pick<MediaQueryList, "matches"> | null,
): boolean {
  if (!mediaQueryList) return false;
  return mediaQueryList.matches;
}

type AudioContextFactory = () => AudioContext | null;

function defaultAudioContextFactory(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export type SoundEngineOptions = {
  createContext?: AudioContextFactory;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  reducedMotion?: boolean;
  initialEnabled?: boolean;
};

export class SoundEngine {
  private readonly createContext: AudioContextFactory;
  private readonly storage: Pick<Storage, "getItem" | "setItem"> | null;
  private context: AudioContext | null = null;
  private enabled: boolean;
  private unlocked = false;
  private reducedMotion: boolean;
  private lastPlayedAt = 0;

  constructor(options: SoundEngineOptions = {}) {
    this.createContext = options.createContext ?? defaultAudioContextFactory;
    this.storage = options.storage ?? null;
    this.reducedMotion = options.reducedMotion ?? false;

    const stored = readSoundPreference(this.storage);
    if (typeof options.initialEnabled === "boolean") {
      this.enabled = options.initialEnabled;
    } else if (stored !== null) {
      this.enabled = stored;
    } else {
      this.enabled = true;
    }
  }

  isEnabled(): boolean {
    return this.enabled && !this.reducedMotion;
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  getStoredPreference(): boolean | null {
    return readSoundPreference(this.storage);
  }

  setEnabled(enabled: boolean, persist = true): void {
    this.enabled = enabled;
    if (persist) {
      writeSoundPreference(this.storage, enabled);
    }
    if (enabled) {
      void this.unlock();
    }
  }

  toggleEnabled(): boolean {
    const next = !this.enabled;
    this.setEnabled(next, true);
    return next;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  async unlock(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === "running") {
      this.unlocked = true;
      return true;
    }
    try {
      await ctx.resume();
      this.unlocked = (ctx.state as AudioContextState) === "running";
      return this.unlocked;
    } catch {
      return false;
    }
  }

  play(type: SoundType): void {
    if (!this.isEnabled()) return;

    const now = Date.now();
    if (now - this.lastPlayedAt < 24) return;
    this.lastPlayedAt = now;

    void this.playInternal(type);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    this.context = this.createContext();
    return this.context;
  }

  private async playInternal(type: SoundType): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state !== "running") {
      const ok = await this.unlock();
      if (!ok) return;
    }

    const recipe = SOUND_RECIPES[type];
    if (!recipe) return;

    try {
      const startAt = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = recipe.masterGain;
      master.connect(ctx.destination);

      for (const tone of recipe.tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const when = startAt + (tone.delay ?? 0);
        const duration = tone.duration;
        const peak = tone.gain ?? 1;

        osc.type = tone.type ?? "sine";
        osc.frequency.setValueAtTime(tone.frequency, when);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(peak, when + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
        osc.connect(gain);
        gain.connect(master);
        osc.start(when);
        osc.stop(when + duration + 0.02);
      }
    } catch {
      /* non-fatal synthesis failure */
    }
  }

  /** Test helper — reset duplicate guard between assertions. */
  resetPlayGuard(): void {
    this.lastPlayedAt = 0;
  }

  /** Test helper — dispose audio context. */
  dispose(): void {
    if (this.context) {
      void this.context.close().catch(() => undefined);
      this.context = null;
    }
    this.unlocked = false;
  }
}

let defaultEngine: SoundEngine | null = null;

export function getSoundEngine(): SoundEngine {
  if (!defaultEngine) {
    defaultEngine = new SoundEngine({
      storage: typeof window !== "undefined" ? window.localStorage : null,
      reducedMotion:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }
  return defaultEngine;
}

export function playSound(type: SoundType): void {
  getSoundEngine().play(type);
}

export function resetSoundEngineForTests(): void {
  defaultEngine?.dispose();
  defaultEngine = null;
}
