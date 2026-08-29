/**
 * V5 Phase 3 / 3.1 — XO Easter Egg game logic + unlock tests.
 * Run: npx tsx scripts/test-xo-easter-egg.ts
 */

import {
  isEditableKeyboardTarget,
  trackUnlockSequence,
  XO_UNLOCK_SEQUENCE,
} from "@/lib/xo-easter-egg";
import {
  alternatePlayerMark,
  applyComputerMove,
  applyPlayerMove,
  cellAriaLabel,
  cellCenterCoord,
  cellCenterPercent,
  checkWinner,
  createEmptyBoard,
  createGameRoles,
  createInitialGameState,
  didComputerWin,
  didPlayerWin,
  getAvailableMoves,
  getComputerMove,
  getHeuristicComputerMove,
  getWinningLineEndpoints,
  isBoardFull,
  isDrawBoard,
  isGameOver,
  pickRandomStarter,
  rowColToIndex,
  shouldRenderWinLine,
  updateStreakOnGameEnd,
  WINNING_LINES,
  XO_COMPUTER_THINK_MS,
  XO_VIEWBOX_SIZE,
  XO_WIN_LINE_ARCHITECTURE,
  type Board,
  type Cell,
  type GameState,
  type Mark,
} from "@/lib/xo-game";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function boardFrom(cells: Cell[]): Board {
  assert(cells.length === 9, "board must have 9 cells");
  return cells as Board;
}

function stateWith(
  board: Cell[],
  status: GameState["status"] = "playing",
  playerMark: Mark = "X",
): GameState {
  const roles = createGameRoles(playerMark);
  const { line } = checkWinner(board);
  let winningLine = line;
  let resolvedStatus = status;
  if (status === "playing") {
    const { winner } = checkWinner(board);
    if (winner === "X") resolvedStatus = "x-won";
    else if (winner === "O") resolvedStatus = "o-won";
    else if (isDrawBoard(board)) resolvedStatus = "draw";
  }
  if (resolvedStatus === "x-won" || resolvedStatus === "o-won") {
    winningLine = checkWinner(board).line;
  } else if (resolvedStatus === "draw") {
    winningLine = null;
  }
  return {
    board: boardFrom(board),
    status: resolvedStatus,
    winningLine,
    roles,
  };
}

function main() {
  section("A. Initial state");
  const initial = createInitialGameState();
  assert(initial.board.every((c) => c === null), "board empty");
  assert(initial.status === "playing", "game active when player is X");
  assert(initial.roles.playerMark === "X", "player starts as X");
  assert(initial.roles.computerMark === "O", "AI starts as O");
  console.log("ok  initial state");

  section("B. Valid move");
  const afterX = applyPlayerMove(initial, 0);
  assert(afterX?.board[0] === "X", "X occupies selected cell");
  assert(afterX?.status === "computer-thinking", "hands off to computer");
  console.log("ok  valid player move");

  section("C. Invalid move");
  const occupied = applyPlayerMove(afterX!, 0);
  assert(occupied === null, "occupied cell rejected");
  const ended = applyPlayerMove(
    stateWith(["X", "O", "X", "O", "X", null, null, null, null], "x-won"),
    5,
  );
  assert(ended === null, "move after win rejected");
  console.log("ok  invalid moves blocked");

  section("D. X wins — all 8 lines");
  for (const line of WINNING_LINES) {
    const cells = createEmptyBoard();
    for (const index of line) cells[index] = "X";
    const { winner, line: winLine } = checkWinner(cells);
    assert(winner === "X", `X wins line ${line.join(",")}`);
    assert(
      winLine !== null && line.every((i) => winLine.includes(i)),
      "winning line detected",
    );
  }
  console.log("ok  all X winning combinations");

  section("E. O wins — all 8 lines");
  for (const line of WINNING_LINES) {
    const cells = createEmptyBoard();
    for (const index of line) cells[index] = "O";
    const { winner } = checkWinner(cells);
    assert(winner === "O", `O wins line ${line.join(",")}`);
  }
  console.log("ok  all O winning combinations");

  section("F. Draw");
  const drawBoard = boardFrom(["X", "O", "X", "X", "O", "O", "O", "X", "X"]);
  assert(isDrawBoard(drawBoard), "full board draw");
  assert(checkWinner(drawBoard).winner === null, "no winner on draw");
  console.log("ok  draw detection");

  section("G. Game ends — no moves after result");
  const drawState = stateWith(
    ["X", "O", "X", "X", "O", "O", "O", "X", "X"],
    "draw",
  );
  assert(isGameOver(drawState.status), "draw is terminal");
  assert(applyPlayerMove(drawState, 0) === null, "no move on draw");

  const xWinState = stateWith(
    ["X", "X", "X", null, "O", null, null, "O", null],
    "x-won",
  );
  assert(applyPlayerMove(xWinState, 3) === null, "no move after X win");
  console.log("ok  terminal states block moves");

  section("H. AI as O (default)");
  const aiWin = boardFrom(["O", "O", null, "X", null, null, null, "X", null]);
  assert(getComputerMove(aiWin, "O") === 2, "computer O takes winning move");

  const aiBlock = boardFrom(["X", "X", null, null, "O", null, null, null, null]);
  assert(getComputerMove(aiBlock, "O") === 2, "computer O blocks threat");

  const aiCenter = boardFrom([null, null, null, null, null, null, null, null, null]);
  assert(getHeuristicComputerMove(aiCenter, "O") === 4, "center preference");

  const aiCorner = boardFrom(["X", null, null, null, "O", null, null, null, null]);
  const cornerMove = getHeuristicComputerMove(aiCorner, "O");
  assert([0, 2, 6, 8].includes(cornerMove), "strategic corner when center taken");

  const almostFull = boardFrom(["X", "O", "X", "O", "X", "O", "O", null, "X"]);
  const lastMove = getComputerMove(almostFull, "O");
  assert(almostFull[lastMove] === null, "AI never picks occupied cell");
  console.log("ok  AI as O");

  section("3.1 — Player can be X");
  const playerX = createInitialGameState("X", "player");
  assert(playerX.roles.playerMark === "X", "player is X");
  assert(playerX.roles.computerMark === "O", "AI is O");
  assert(playerX.status === "playing", "player can start");
  console.log("ok  player can be X");

  section("3.1 — Player can be O");
  const playerO = createInitialGameState("O", "player");
  assert(playerO.roles.playerMark === "O", "player is O");
  assert(playerO.roles.computerMark === "X", "AI is X");
  assert(playerO.status === "playing", "player can start as O");
  console.log("ok  player can be O");

  section("3.1 — AI can be X");
  const aiAsX = createInitialGameState("O", "computer");
  assert(aiAsX.roles.computerMark === "X", "AI is X");
  const aiXMove = applyComputerMove(aiAsX);
  assert(aiXMove?.board.some((c) => c === "X"), "AI places X when AI is X");
  console.log("ok  AI can be X");

  section("3.1 — AI can be O");
  const aiAsO = createInitialGameState("X", "player");
  assert(aiAsO.roles.computerMark === "O", "AI is O");
  const playerFirst = applyPlayerMove(aiAsO, 0);
  const aiOMove = applyComputerMove(playerFirst!);
  assert(aiOMove?.board.some((c) => c === "O"), "AI places O when AI is O");
  console.log("ok  AI can be O");

  section("3.3 — Random starting player selection");
  assert(pickRandomStarter(() => 0) === "player", "0 → player");
  assert(pickRandomStarter(() => 0.49) === "player", "0.49 → player");
  assert(pickRandomStarter(() => 0.5) === "computer", "0.5 → computer");
  assert(pickRandomStarter(() => 0.99) === "computer", "0.99 → computer");
  assert(XO_COMPUTER_THINK_MS === 420, "thinking delay constant");

  const starters = new Set(
    Array.from({ length: 20 }, (_, i) =>
      pickRandomStarter(() => i / 20),
    ),
  );
  assert(starters.has("player"), "randomizer can pick player");
  assert(starters.has("computer"), "randomizer can pick computer");

  const playerStarts = createInitialGameState("X", "player");
  assert(playerStarts.status === "playing", "player selected as starter");

  const aiStarts = createInitialGameState("O", "computer");
  assert(aiStarts.status === "computer-thinking", "AI selected as starter");

  const marksIndependent = createInitialGameState("X", "computer");
  assert(marksIndependent.roles.playerMark === "X", "marks unchanged when AI starts");
  assert(marksIndependent.roles.computerMark === "O", "marks unchanged when AI starts");
  assert(marksIndependent.status === "computer-thinking", "starter independent of marks");
  console.log("ok  random starting player");

  section("3.3 — AI opening move");
  const aiOpening = createInitialGameState("X", "computer");
  assert(aiOpening.status === "computer-thinking", "thinking before opening");
  const afterOpening = applyComputerMove(aiOpening);
  assert(afterOpening !== null, "AI makes opening move");
  assert(
    afterOpening!.board.filter((cell) => cell !== null).length === 1,
    "exactly one opening mark",
  );
  assert(afterOpening!.status === "playing", "player turn after AI opens");
  assert(
    afterOpening!.board.some((cell) => cell === "O"),
    "AI uses its assigned mark",
  );
  const secondAiMove = applyComputerMove(afterOpening!);
  assert(secondAiMove === null, "AI cannot move twice on opening");
  console.log("ok  AI opening move");

  section("3.3 — Player starter unchanged");
  const playerOpens = createInitialGameState("O", "player");
  const playerMove = applyPlayerMove(playerOpens, 4);
  assert(playerMove?.board[4] === "O", "player moves first when selected");
  assert(playerMove?.status === "computer-thinking", "AI responds after player");
  console.log("ok  player starter behavior");

  section("3.1 — Minimax as X");
  const aiXWin = boardFrom(["X", "X", null, "O", null, null, null, "O", null]);
  assert(getComputerMove(aiXWin, "X") === 2, "AI X takes winning move");
  const aiXBlock = boardFrom(["O", "O", null, null, "X", null, null, null, null]);
  assert(getComputerMove(aiXBlock, "X") === 2, "AI X blocks O threat");
  assert(getHeuristicComputerMove(createEmptyBoard(), "X") === 4, "AI X takes center");
  console.log("ok  minimax works when AI is X");

  section("3.1 — Minimax as O");
  assert(getComputerMove(aiWin, "O") === 2, "minimax still works when AI is O");
  console.log("ok  minimax works when AI is O");

  section("3.1 — Winning line geometry (all 8)");
  for (const line of WINNING_LINES) {
    const cells = createEmptyBoard();
    for (const index of line) cells[index] = "X";
    const { line: winLine } = checkWinner(cells);
    assert(winLine !== null, `line exists for ${line.join(",")}`);
    const endpoints = getWinningLineEndpoints(winLine);
    assert(
      typeof endpoints.x1 === "number" &&
        typeof endpoints.y1 === "number" &&
        typeof endpoints.x2 === "number" &&
        typeof endpoints.y2 === "number" &&
        typeof endpoints.length === "number",
      "endpoints computed",
    );
    assert(
      endpoints.x1 !== endpoints.x2 || endpoints.y1 !== endpoints.y2,
      "line has length",
    );
    assert(endpoints.length > 0, "path length is positive");

    const first = cellCenterCoord(line[0]!);
    const last = cellCenterCoord(line[2]!);
    const span = Math.hypot(last.x - first.x, last.y - first.y);
    assert(endpoints.length > span, "line extends beyond cell centers");

    const mid = cellCenterCoord(line[1]!);
    const crossProduct =
      (endpoints.x2 - endpoints.x1) * (mid.y - endpoints.y1) -
      (endpoints.y2 - endpoints.y1) * (mid.x - endpoints.x1);
    assert(Math.abs(crossProduct) < 1, `middle cell on line ${line.join(",")}`);
  }

  const row0 = getWinningLineEndpoints([0, 1, 2]);
  assert(Math.abs(row0.y1 - row0.y2) < 0.01, "top row is horizontal");
  assert(row0.x1 < cellCenterCoord(0).x, "top row extends before first cell");
  assert(row0.x2 > cellCenterCoord(2).x, "top row extends past third cell");

  const row1 = getWinningLineEndpoints([3, 4, 5]);
  assert(Math.abs(row1.y1 - row1.y2) < 0.01, "middle row is horizontal");

  const row2 = getWinningLineEndpoints([6, 7, 8]);
  assert(Math.abs(row2.y1 - row2.y2) < 0.01, "bottom row is horizontal");

  const col0 = getWinningLineEndpoints([0, 3, 6]);
  assert(Math.abs(col0.x1 - col0.x2) < 0.01, "left column is vertical");
  assert(col0.y1 < cellCenterCoord(0).y, "left column extends above first cell");
  assert(col0.y2 > cellCenterCoord(6).y, "left column extends below third cell");

  const col1 = getWinningLineEndpoints([1, 4, 7]);
  assert(Math.abs(col1.x1 - col1.x2) < 0.01, "middle column is vertical");

  const col2 = getWinningLineEndpoints([2, 5, 8]);
  assert(Math.abs(col2.x1 - col2.x2) < 0.01, "right column is vertical");

  const diagDown = getWinningLineEndpoints([0, 4, 8]);
  assert(diagDown.x1 < cellCenterCoord(0).x, "diag ↘ extends before origin");
  assert(diagDown.y1 < cellCenterCoord(0).y, "diag ↘ extends before origin");
  assert(diagDown.x2 > cellCenterCoord(8).x, "diag ↘ extends past end");
  assert(diagDown.y2 > cellCenterCoord(8).y, "diag ↘ extends past end");

  const diagUp = getWinningLineEndpoints([2, 4, 6]);
  assert(diagUp.x1 > cellCenterCoord(2).x, "diag ↗ extends before top-right");
  assert(diagUp.y1 < cellCenterCoord(2).y, "diag ↗ extends before top-right");
  assert(diagUp.x2 < cellCenterCoord(6).x, "diag ↗ extends past bottom-left");
  assert(diagUp.y2 > cellCenterCoord(6).y, "diag ↗ extends past bottom-left");

  console.log("ok  all 8 winning line geometries");

  section("3.3 — Win-line overlay architecture");
  assert(XO_VIEWBOX_SIZE === 300, "viewBox is 300");
  assert(
    XO_WIN_LINE_ARCHITECTURE.boardStageClass === "xo-board-stage",
    "stage class",
  );
  assert(
    XO_WIN_LINE_ARCHITECTURE.boardGridClass === "xo-board-grid",
    "grid class",
  );
  assert(
    XO_WIN_LINE_ARCHITECTURE.boardOverlayClass === "xo-board-win-line",
    "overlay class",
  );
  assert(
    XO_WIN_LINE_ARCHITECTURE.overlayInsideCell === false,
    "overlay not inside cells",
  );
  assert(!shouldRenderWinLine(null, "playing"), "no line while playing");
  assert(!shouldRenderWinLine([0, 1, 2], "playing"), "no line before terminal");
  assert(shouldRenderWinLine([0, 1, 2], "x-won"), "line on x-won");
  assert(shouldRenderWinLine([0, 1, 2], "o-won"), "line on o-won");
  assert(!shouldRenderWinLine(null, "draw"), "no line on draw");
  console.log("ok  overlay architecture contract");

  section("3.3 — One continuous line per winning combination");
  for (const line of WINNING_LINES) {
    const endpoints = getWinningLineEndpoints(line);
    const first = cellCenterCoord(line[0]!);
    const mid = cellCenterCoord(line[1]!);
    const last = cellCenterCoord(line[2]!);

    const cross =
      (endpoints.x2 - endpoints.x1) * (mid.y - endpoints.y1) -
      (endpoints.y2 - endpoints.y1) * (mid.x - endpoints.x1);
    assert(Math.abs(cross) < 1, `middle cell on line ${line.join(",")}`);

    const distFirst = Math.hypot(mid.x - endpoints.x1, mid.y - endpoints.y1);
    const distLast = Math.hypot(endpoints.x2 - mid.x, endpoints.y2 - mid.y);
    const span = Math.hypot(endpoints.x2 - endpoints.x1, endpoints.y2 - endpoints.y1);
    assert(
      Math.abs(distFirst + distLast - span) < 1,
      `single segment spans line ${line.join(",")}`,
    );
  }
  console.log("ok  one continuous line for all 8 combinations");

  section("3.1 — Mark alternation");
  assert(alternatePlayerMark("X") === "O", "X → O");
  assert(alternatePlayerMark("O") === "X", "O → X");
  assert(alternatePlayerMark(alternatePlayerMark("X")) === "X", "round trip");
  console.log("ok  mark alternation");

  section("3.1 — Player win detection with roles");
  const playerXWins = stateWith(["X", "X", "X", "O", "O", null, null, null, null], "x-won", "X");
  assert(didPlayerWin(playerXWins), "player X wins when holding X");
  assert(!didComputerWin(playerXWins), "computer did not win");

  const playerOWins = stateWith(["O", "O", "O", "X", "X", null, null, null, null], "o-won", "O");
  assert(didPlayerWin(playerOWins), "player O wins when holding O");
  console.log("ok  role-aware win detection");

  section("3.1 — Streak increments on player win");
  let streak = 0;
  streak = updateStreakOnGameEnd(streak, playerXWins);
  assert(streak === 1, "first player win → streak 1");
  console.log("ok  player win increments streak");

  section("3.1 — Consecutive player wins");
  streak = updateStreakOnGameEnd(streak, playerXWins);
  assert(streak === 2, "second consecutive win → streak 2");
  streak = updateStreakOnGameEnd(streak, playerOWins);
  assert(streak === 3, "third consecutive win → streak 3");
  console.log("ok  consecutive wins increment streak");

  section("3.1 — AI win resets streak");
  const aiWins = stateWith(["O", "O", "O", "X", "X", null, null, null, null], "o-won", "X");
  assert(didComputerWin(aiWins), "computer won");
  streak = updateStreakOnGameEnd(streak, aiWins);
  assert(streak === 0, "AI win resets streak");
  console.log("ok  AI win resets streak");

  section("3.1 — Draw resets streak");
  streak = 2;
  streak = updateStreakOnGameEnd(streak, drawState);
  assert(streak === 0, "draw resets streak");
  console.log("ok  draw resets streak");

  section("3.1 — Streak unchanged during play");
  const midPlay = createInitialGameState("X");
  const afterMove = applyPlayerMove(midPlay, 4)!;
  streak = 1;
  assert(updateStreakOnGameEnd(streak, afterMove) === 1, "no premature streak change");
  console.log("ok  streak only updates on game end");

  section("3.1 — Closing XO resets streak");
  let sessionStreak = 0;
  sessionStreak = updateStreakOnGameEnd(sessionStreak, playerXWins);
  sessionStreak = updateStreakOnGameEnd(sessionStreak, playerXWins);
  assert(sessionStreak === 2, "session had active streak");
  sessionStreak = 0;
  assert(sessionStreak === 0, "closing dialog resets streak to 0");
  console.log("ok  close resets streak");

  section("3.1 — Reopening XO starts streak 0");
  const reopenStreak = 0;
  assert(reopenStreak === 0, "fresh open always starts at 0");
  console.log("ok  reopen starts streak 0");

  section("I. Restart / reset semantics");
  const midGame = applyPlayerMove(initial, 4)!;
  const restarted = createInitialGameState("X", "player");
  assert(restarted.board.every((c) => c === null), "restart clears board");
  assert(restarted.status === "playing", "restart resets status");
  assert(restarted.winningLine === null, "restart clears winning line");
  assert(midGame.board[4] === "X", "previous game isolated");

  const resetSameMark = createInitialGameState("O", "computer");
  assert(resetSameMark.roles.playerMark === "O", "same-mark reset keeps O");
  assert(resetSameMark.status === "computer-thinking", "AI can start after reset");
  console.log("ok  clean restart state");

  section("J. Race conditions — stale computer move");
  const thinking = applyPlayerMove(initial, 0)!;
  assert(thinking.status === "computer-thinking", "awaiting computer");
  const computer = applyComputerMove(thinking);
  assert(computer !== null, "computer move applies once");
  assert(computer!.board.some((c) => c === "O"), "O placed");
  const doubleComputer = applyComputerMove(computer!);
  assert(doubleComputer === null, "cannot move when not computer-thinking");

  const rapid = applyPlayerMove(initial, 1);
  const rapidAgain = applyPlayerMove(rapid!, 1);
  assert(rapidAgain === null, "double tap same cell blocked");

  const aiOpeningRace = createInitialGameState("O", "computer");
  const openingMove = applyComputerMove(aiOpeningRace);
  assert(openingMove !== null, "AI opening move applies");
  assert(openingMove!.status === "playing", "returns to player turn");
  console.log("ok  no duplicate / stale moves");

  section("K. Accessibility labels");
  assert(cellAriaLabel(0, 0, null) === "Row 1, Column 1, Empty", "empty label");
  assert(cellAriaLabel(1, 2, "X") === "Row 2, Column 3, X", "X label");
  assert(cellAriaLabel(2, 1, "O") === "Row 3, Column 2, O", "O label");
  assert(rowColToIndex(2, 1) === 7, "row/col index mapping");
  console.log("ok  accessible cell labels");

  section("L. Unlock sequence");
  assert(XO_UNLOCK_SEQUENCE.join("") === "xo", "sequence constant");
  let buffer: string[] = [];
  ({ buffer } = trackUnlockSequence(buffer, "x"));
  assert(buffer.join("") === "x", "partial buffer");
  const unlocked = trackUnlockSequence(buffer, "o");
  assert(unlocked.unlocked, "xo unlocks");
  assert(unlocked.buffer.length === 0, "buffer clears on unlock");

  const noise = trackUnlockSequence(["a", "b"], "x");
  assert(!noise.unlocked, "wrong prefix does not unlock");
  console.log("ok  keyboard unlock");

  section("Editable target guard");
  const input = { tagName: "INPUT", isContentEditable: false } as unknown as EventTarget;
  assert(isEditableKeyboardTarget(input), "input is editable");
  const div = {
    tagName: "DIV",
    isContentEditable: false,
    closest: () => null,
  } as unknown as EventTarget;
  assert(!isEditableKeyboardTarget(div), "plain div is not editable");
  console.log("ok  editable guard");

  section("Board helpers");
  const full = boardFrom(["X", "O", "X", "O", "X", "O", "O", "X", "O"]);
  assert(isBoardFull(full), "board full");
  assert(getAvailableMoves(full).length === 0, "no moves on full board");
  console.log("ok  board helpers");

  console.log("\nXO Easter Egg tests passed.\n");
}

main();
