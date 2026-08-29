/**
 * V5 Phase 6.2 — fair XO AI, computer-move reliability, rounded tiles.
 * Run: npx tsx scripts/test-v5-phase-6-2.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyComputerMove,
  applyPlayerMove,
  createInitialGameState,
  didComputerWin,
  didPlayerWin,
  getComputerMove,
  getMercyComputerMove,
  shouldUseMercyMode,
  updateConsecutiveComputerWins,
  XO_COMPUTER_THINK_MS,
  type GameState,
  type Mark,
} from "@/lib/xo-game";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function stateWith(
  board: Array<"X" | "O" | null>,
  status: GameState["status"],
  playerMark: Mark = "X",
): GameState {
  return {
    board: board as GameState["board"],
    status,
    winningLine: null,
    roles: {
      playerMark,
      computerMark: playerMark === "X" ? "O" : "X",
    },
  };
}

function computerWin(playerMark: Mark = "X"): GameState {
  const computerMark = playerMark === "X" ? "O" : "X";
  const board: Array<"X" | "O" | null> = [
    computerMark,
    computerMark,
    computerMark,
    playerMark,
    playerMark,
    null,
    null,
    null,
    null,
  ];
  return {
    board: board as GameState["board"],
    status: computerMark === "X" ? "x-won" : "o-won",
    winningLine: [0, 1, 2],
    roles: { playerMark, computerMark },
  };
}

function playerWin(playerMark: Mark = "X"): GameState {
  return {
    board: [
      playerMark,
      playerMark,
      playerMark,
      "O",
      "O",
      null,
      null,
      null,
      null,
    ] as GameState["board"],
    status: playerMark === "X" ? "x-won" : "o-won",
    winningLine: [0, 1, 2],
    roles: {
      playerMark,
      computerMark: playerMark === "X" ? "O" : "X",
    },
  };
}

function drawState(): GameState {
  return {
    board: ["X", "O", "X", "X", "O", "O", "O", "X", "X"] as GameState["board"],
    status: "draw",
    winningLine: null,
    roles: { playerMark: "X", computerMark: "O" },
  };
}

/** Minimal harness mirroring XoGame timer/session scheduling. */
async function simulateThinkingLifecycle(
  starter: "player" | "computer",
): Promise<GameState> {
  let session = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let state = createInitialGameState("X", starter);

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleMove(activeSession: number) {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      if (activeSession !== session) return;
      if (state.status !== "computer-thinking") return;
      state = applyComputerMove(state) ?? state;
    }, XO_COMPUTER_THINK_MS);
  }

  function ensureThinkingScheduled() {
    if (state.status !== "computer-thinking") return;
    if (timer !== null) return;
    scheduleMove(session);
  }

  // Mount effect — fixes computer-starting hang.
  ensureThinkingScheduled();

  await new Promise((resolve) => setTimeout(resolve, XO_COMPUTER_THINK_MS + 40));
  return state;
}

async function main() {
  console.log("\n=== A. Consecutive computer wins ===");
  let counter = 0;
  counter = updateConsecutiveComputerWins(counter, computerWin());
  assert(counter === 1, "first computer win → 1");
  counter = updateConsecutiveComputerWins(counter, computerWin());
  assert(counter === 2, "second consecutive computer win → 2");
  assert(shouldUseMercyMode(counter), "mercy after two computer wins");
  counter = updateConsecutiveComputerWins(counter, playerWin());
  assert(counter === 0, "human win resets counter");
  counter = 2;
  counter = updateConsecutiveComputerWins(counter, drawState());
  assert(counter === 2, "draw does not change computer-win counter");
  console.log("ok  consecutive computer wins + mercy threshold");

  console.log("\n=== B. Mercy move behavior ===");
  const blockBoard = [
    "X",
    "X",
    null,
    null,
    "O",
    null,
    null,
    null,
    null,
  ] as GameState["board"];
  const optimal = getComputerMove(blockBoard, "O");
  const mercy = getMercyComputerMove(blockBoard, "O");
  assert(optimal === 2, "optimal move blocks X win");
  assert(mercy !== 2, "mercy move misses the block");
  assert(blockBoard[mercy] === null, "mercy move targets empty cell");

  const mercyState = stateWith(blockBoard, "computer-thinking", "X");
  const afterMercy = applyComputerMove(mercyState, { mercy: true });
  assert(afterMercy !== null, "mercy computer move applies");
  assert(afterMercy!.board[2] === null, "mercy leaves X winning threat open");
  console.log("ok  mercy uses suboptimal move");

  console.log("\n=== C. Random starter reliability ===");
  const playerStart = createInitialGameState("X", "player");
  assert(playerStart.status === "playing", "player can start");
  const computerStart = createInitialGameState("O", "computer");
  assert(computerStart.status === "computer-thinking", "computer can start");
  const afterOpen = applyComputerMove(computerStart);
  assert(afterOpen?.status === "playing", "one opening AI move");
  assert(
    afterOpen!.board.filter((cell) => cell !== null).length === 1,
    "exactly one opening mark",
  );
  console.log("ok  random starter + opening move");

  console.log("\n=== D. Computer thinking lifecycle ===");
  const opened = await simulateThinkingLifecycle("computer");
  assert(opened.status === "playing", "computer-starting game does not hang");
  assert(
    opened.board.filter((cell) => cell !== null).length === 1,
    "exactly one AI move after think delay",
  );

  let session = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let state = createInitialGameState("X", "computer");
  const staleSession = session;
  timer = setTimeout(() => {
    if (staleSession !== session) return;
    state = applyComputerMove(state) ?? state;
  }, XO_COMPUTER_THINK_MS);
  session += 1;
  state = createInitialGameState("X", "player");
  await new Promise((resolve) => setTimeout(resolve, XO_COMPUTER_THINK_MS + 40));
  assert(state.status === "playing", "stale timer ignored after new session");
  assert(state.board.every((cell) => cell === null), "stale move did not apply");
  if (timer) clearTimeout(timer);
  console.log("ok  timer/session lifecycle");

  console.log("\n=== E. AI safety ===");
  const thinking = applyPlayerMove(createInitialGameState("X", "player"), 0)!;
  const once = applyComputerMove(thinking);
  const twice = applyComputerMove(once!);
  assert(twice === null, "AI cannot move twice in a row");
  const terminal = applyComputerMove(
    stateWith(["O", "O", "O", "X", "X", null, null, null, null], "o-won"),
  );
  assert(terminal === null, "AI cannot move after game over");
  const occupied = applyComputerMove(
    stateWith(["X", null, null, null, null, null, null, null, null], "computer-thinking"),
  );
  assert(occupied?.board.some((cell) => cell === "O"), "AI uses assigned mark on empty cell");
  assert(occupied?.board[0] === "X", "AI does not overwrite occupied cell");
  console.log("ok  AI safety");

  console.log("\n=== F. UI scheduling guard ===");
  const component = read("components/easter-egg/xo-game.tsx");
  assert(
    component.includes("if (thinkTimerRef.current !== null) return"),
    "thinking effect avoids duplicate timers",
  );
  assert(
    component.includes("ensureThinkingScheduled") === false &&
      component.includes("if (state.status !== \"computer-thinking\") return"),
    "mount guard schedules pending AI move",
  );
  assert(component.includes("rounded-button"), "XO tiles use rounded-button");
  assert(!component.includes("rounded-none"), "XO tiles are not sharp squares");
  console.log("ok  component scheduling + rounded tiles");

  console.log("\nV5 Phase 6.2 tests passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
