/**
 * V5 Phase 4 — sound system tests.
 * Run: npx tsx scripts/test-sound-effects.ts
 */

import {
  SOUND_STORAGE_KEY,
  SOUND_TYPES,
  SoundEngine,
  XO_SOUND_EVENTS,
  isSoundType,
  playSound,
  readSoundPreference,
  resetSoundEngineForTests,
  writeSoundPreference,
  type SoundType,
} from "@/lib/sound-effects";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

class MockStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

class MockAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  resumeCalls = 0;
  nodesCreated = 0;

  createGain() {
    this.nodesCreated += 1;
    return {
      gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    };
  }

  createOscillator() {
    this.nodesCreated += 1;
    return {
      type: "sine",
      frequency: { setValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    };
  }

  async resume() {
    this.resumeCalls += 1;
    this.state = "running";
  }

  async close() {
    this.state = "closed";
  }
}

function createMockEngine(options?: {
  reducedMotion?: boolean;
  storage?: MockStorage;
  resumeFails?: boolean;
}) {
  const storage = options?.storage ?? new MockStorage();
  const ctx = new MockAudioContext();
  if (options?.resumeFails) {
    ctx.resume = async () => {
      throw new Error("blocked");
    };
  }

  const engine = new SoundEngine({
    storage,
    reducedMotion: options?.reducedMotion ?? false,
    createContext: () => ctx as unknown as AudioContext,
  });

  return { engine, ctx, storage };
}

function testApiExists() {
  section("A. sound API exists");
  assert(typeof playSound === "function", "playSound should exist");
  assert(typeof SoundEngine === "function", "SoundEngine should exist");
  console.log("PASS");
}

function testSemanticTypes() {
  section("B. semantic sound types are valid");
  for (const type of SOUND_TYPES) {
    assert(isSoundType(type), `${type} should be valid`);
  }
  assert(!isSoundType("music"), "unknown type rejected");
  console.log(`PASS (${SOUND_TYPES.length} types)`);
}

function testDisabledPreventsPlayback() {
  section("C. disabled state prevents playback");
  const { engine, ctx } = createMockEngine();
  engine.setEnabled(false, false);
  engine.resetPlayGuard();
  engine.play("click");
  assert(ctx.nodesCreated === 0, "no nodes when disabled");
  console.log("PASS");
}

function testEnabledAttemptsPlayback() {
  section("D. enabled state attempts playback");
  const { engine, ctx } = createMockEngine();
  engine.setEnabled(true, false);
  void engine.unlock();
  engine.resetPlayGuard();
  engine.play("click");
  assert(ctx.nodesCreated > 0, "oscillators created when enabled");
  console.log("PASS");
}

function testInitializationSafe() {
  section("E/F. initialization and repeated initialization are safe");
  const { engine, ctx } = createMockEngine();
  assert(engine.isEnabled(), "defaults enabled when no preference");
  void engine.unlock();
  void engine.unlock();
  engine.resetPlayGuard();
  engine.play("open");
  engine.resetPlayGuard();
  engine.play("close");
  assert(ctx.resumeCalls >= 1, "resume attempted");
  console.log("PASS");
}

function testAudioFailuresCaught() {
  section("G. browser/audio failures are caught");
  const { engine } = createMockEngine({ resumeFails: true });
  engine.setEnabled(true, false);
  void engine.unlock().then((ok) => assert(!ok, "unlock returns false on failure"));
  engine.resetPlayGuard();
  engine.play("error");
  console.log("PASS");
}

function testLocalStoragePreference() {
  section("H. localStorage preference handling");
  const storage = new MockStorage();
  assert(readSoundPreference(storage) === null, "missing key -> null");
  writeSoundPreference(storage, false);
  assert(readSoundPreference(storage) === false, "false stored");
  writeSoundPreference(storage, true);
  assert(readSoundPreference(storage) === true, "true stored");

  const { engine } = createMockEngine({ storage });
  assert(engine.getStoredPreference() === true, "engine reads preference");
  engine.setEnabled(false);
  assert(storage.getItem(SOUND_STORAGE_KEY) === "false", "persisted false");
  console.log("PASS");
}

function testNoAutoplayOnLoad() {
  section("I. no sound on page load");
  const { engine, ctx } = createMockEngine();
  assert(ctx.nodesCreated === 0, "constructing engine does not play audio");
  assert(!engine.isUnlocked(), "not unlocked until user gesture");
  console.log("PASS");
}

function testXoSoundMapping() {
  section("J. XO sound events map correctly");
  for (const [event, sound] of Object.entries(XO_SOUND_EVENTS)) {
    assert(isSoundType(sound), `${event} -> ${sound}`);
  }
  console.log(`PASS (${Object.keys(XO_SOUND_EVENTS).length} events)`);
}

function testToggleWorks() {
  section("K. toggling sound works");
  const { engine } = createMockEngine();
  assert(engine.isEnabled(), "starts enabled");
  engine.toggleEnabled();
  assert(!engine.isEnabled(), "toggled off");
  engine.toggleEnabled();
  assert(engine.isEnabled(), "toggled on");
  console.log("PASS");
}

function testDuplicateGuard() {
  section("L. duplicate sound invocation guard");
  const { engine, ctx } = createMockEngine();
  engine.setEnabled(true, false);
  void engine.unlock();
  engine.resetPlayGuard();
  engine.play("select");
  const afterFirst = ctx.nodesCreated;
  engine.play("select");
  assert(ctx.nodesCreated === afterFirst, "rapid duplicate suppressed");
  console.log("PASS");
}

function testReducedMotionDisables() {
  section("Accessibility — reduced motion disables playback");
  const { engine, ctx } = createMockEngine({ reducedMotion: true });
  engine.resetPlayGuard();
  engine.play("click");
  assert(ctx.nodesCreated === 0, "reduced motion blocks playback");
  console.log("PASS");
}

function main() {
  console.log("V5 Phase 4 — Sound system tests");
  try {
    testApiExists();
    testSemanticTypes();
    testDisabledPreventsPlayback();
    testEnabledAttemptsPlayback();
    testInitializationSafe();
    testAudioFailuresCaught();
    testLocalStoragePreference();
    testNoAutoplayOnLoad();
    testXoSoundMapping();
    testToggleWorks();
    testDuplicateGuard();
    testReducedMotionDisables();
    console.log("\nAll sound tests passed.");
  } finally {
    resetSoundEngineForTests();
  }
}

main();
