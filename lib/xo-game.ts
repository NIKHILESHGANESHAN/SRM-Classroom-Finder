/**
 * Tic-Tac-Toe (XO) — pure game logic for the ClassFinder Easter Egg.
 * Player and computer marks alternate between games. No React dependencies.
 */

export type Cell = "X" | "O" | null;
export type Mark = "X" | "O";

export type Board = [
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
];

export type GameStatus =
  | "playing"
  | "computer-thinking"
  | "x-won"
  | "o-won"
  | "draw";

export type GameRoles = {
  playerMark: Mark;
  computerMark: Mark;
};

/** Who moves first in a new game — independent of X/O mark assignment. */
export type GameStarter = "player" | "computer";

export const XO_COMPUTER_THINK_MS = 420;

export type GameState = {
  board: Board;
  status: GameStatus;
  winningLine: readonly number[] | null;
  roles: GameRoles;
};

/** All eight winning triplets (row, column, diagonal). */
export const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export const CENTER_INDEX = 4;
export const CORNER_INDICES = [0, 2, 6, 8] as const;

export function createEmptyBoard(): Board {
  return [null, null, null, null, null, null, null, null, null];
}

export function createGameRoles(playerMark: Mark = "X"): GameRoles {
  return {
    playerMark,
    computerMark: playerMark === "X" ? "O" : "X",
  };
}

export function alternatePlayerMark(current: Mark): Mark {
  return current === "X" ? "O" : "X";
}

/** 50/50 random starter for each new game. Injectable `random` for tests. */
export function pickRandomStarter(
  random: () => number = Math.random,
): GameStarter {
  return random() < 0.5 ? "player" : "computer";
}

export function createInitialGameState(
  playerMark: Mark = "X",
  starter: GameStarter = "player",
): GameState {
  const roles = createGameRoles(playerMark);

  return {
    board: createEmptyBoard(),
    status: starter === "computer" ? "computer-thinking" : "playing",
    winningLine: null,
    roles,
  };
}

export function isBoardFull(board: readonly Cell[]): boolean {
  return board.every((cell) => cell !== null);
}

export function checkWinner(board: readonly Cell[]): {
  winner: Mark | null;
  line: readonly number[] | null;
} {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const first = board[a];
    if (first && first === board[b] && first === board[c]) {
      return { winner: first, line };
    }
  }
  return { winner: null, line: null };
}

export function isDrawBoard(board: readonly Cell[]): boolean {
  return isBoardFull(board) && checkWinner(board).winner === null;
}

export function getAvailableMoves(board: readonly Cell[]): number[] {
  const moves: number[] = [];
  for (let i = 0; i < 9; i += 1) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

function cloneBoard(board: readonly Cell[]): Board {
  return [...board] as Board;
}

function opponentMark(mark: Mark): Mark {
  return mark === "X" ? "O" : "X";
}

function statusForWinner(winner: Mark): "x-won" | "o-won" {
  return winner === "X" ? "x-won" : "o-won";
}

function findWinningMove(
  board: readonly Cell[],
  player: Mark,
): number | null {
  for (const index of getAvailableMoves(board)) {
    const next = cloneBoard(board);
    next[index] = player;
    if (checkWinner(next).winner === player) return index;
  }
  return null;
}

function pickStrategicMove(board: readonly Cell[]): number | null {
  if (board[CENTER_INDEX] === null) return CENTER_INDEX;

  const corners = CORNER_INDICES.filter((index) => board[index] === null);
  if (corners.length > 0) return corners[0] ?? null;

  const moves = getAvailableMoves(board);
  return moves[0] ?? null;
}

function rankComputerMoves(
  board: readonly Cell[],
  computerMark: Mark,
): { index: number; score: number }[] {
  const moves = getAvailableMoves(board);
  const opponent = opponentMark(computerMark);

  return moves
    .map((index) => {
      const next = cloneBoard(board);
      next[index] = computerMark;
      return {
        index,
        score: minimax(next, false, computerMark, opponent),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Suboptimal move for mercy mode — misses blocks when possible and avoids the
 * minimax-best reply so the human can win through normal play.
 */
export function getMercyComputerMove(
  board: readonly Cell[],
  computerMark: Mark,
): number {
  const moves = getAvailableMoves(board);
  if (moves.length === 0) {
    throw new Error("getMercyComputerMove called on full board");
  }

  const opponent = opponentMark(computerMark);
  const optimal = getComputerMove(board, computerMark);
  const mustBlock = findWinningMove(board, opponent);

  if (mustBlock !== null) {
    const alternatives = moves.filter((index) => index !== mustBlock);
    if (alternatives.length > 0) {
      const ranked = rankComputerMoves(board, computerMark).filter(
        (entry) => entry.index !== mustBlock,
      );
      const weakest = ranked[ranked.length - 1];
      if (weakest) return weakest.index;
      return alternatives[0]!;
    }
  }

  const ranked = rankComputerMoves(board, computerMark);
  const suboptimal = ranked.filter((entry) => entry.index !== optimal);
  if (suboptimal.length > 0) {
    return suboptimal[suboptimal.length - 1]!.index;
  }

  return optimal;
}

/**
 * Minimax move selection — optimal play for the given computer mark.
 */
export function getComputerMove(
  board: readonly Cell[],
  computerMark: Mark,
): number {
  const moves = getAvailableMoves(board);
  if (moves.length === 0) {
    throw new Error("getComputerMove called on full board");
  }

  const opponent = opponentMark(computerMark);

  const winNow = findWinningMove(board, computerMark);
  if (winNow !== null) return winNow;

  const block = findWinningMove(board, opponent);
  if (block !== null) return block;

  let bestScore = -Infinity;
  let bestMove = moves[0]!;

  for (const index of moves) {
    const next = cloneBoard(board);
    next[index] = computerMark;
    const score = minimax(next, false, computerMark, opponent);
    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }

  return bestMove;
}

function minimax(
  board: Board,
  maximizing: boolean,
  computerMark: Mark,
  opponentMark: Mark,
): number {
  const { winner } = checkWinner(board);
  if (winner === computerMark) return 10;
  if (winner === opponentMark) return -10;
  if (isBoardFull(board)) return 0;

  const moves = getAvailableMoves(board);
  if (maximizing) {
    let best = -Infinity;
    for (const index of moves) {
      const next = cloneBoard(board);
      next[index] = computerMark;
      best = Math.max(best, minimax(next, false, computerMark, opponentMark));
    }
    return best;
  }

  let best = Infinity;
  for (const index of moves) {
    const next = cloneBoard(board);
    next[index] = opponentMark;
    best = Math.min(best, minimax(next, true, computerMark, opponentMark));
  }
  return best;
}

/** Exposed for tests — priority fallback without full minimax tree. */
export function getHeuristicComputerMove(
  board: readonly Cell[],
  computerMark: Mark,
): number {
  const opponent = opponentMark(computerMark);

  const winNow = findWinningMove(board, computerMark);
  if (winNow !== null) return winNow;

  const block = findWinningMove(board, opponent);
  if (block !== null) return block;

  const strategic = pickStrategicMove(board);
  if (strategic !== null) return strategic;

  return getAvailableMoves(board)[0]!;
}

export function applyPlayerMove(
  state: GameState,
  index: number,
): GameState | null {
  if (state.status !== "playing") return null;
  if (index < 0 || index > 8) return null;
  if (state.board[index] !== null) return null;

  const board = cloneBoard(state.board);
  board[index] = state.roles.playerMark;

  const { winner, line } = checkWinner(board);
  if (winner === state.roles.playerMark) {
    return {
      board,
      status: statusForWinner(winner),
      winningLine: line,
      roles: state.roles,
    };
  }
  if (isBoardFull(board)) {
    return { board, status: "draw", winningLine: null, roles: state.roles };
  }

  return {
    board,
    status: "computer-thinking",
    winningLine: null,
    roles: state.roles,
  };
}

export function applyComputerMove(
  state: GameState,
  options?: { mercy?: boolean },
): GameState | null {
  if (state.status !== "computer-thinking") return null;

  const index = options?.mercy
    ? getMercyComputerMove(state.board, state.roles.computerMark)
    : getComputerMove(state.board, state.roles.computerMark);
  if (state.board[index] !== null) return null;

  const board = cloneBoard(state.board);
  board[index] = state.roles.computerMark;

  const { winner, line } = checkWinner(board);
  if (winner === state.roles.computerMark) {
    return {
      board,
      status: statusForWinner(winner),
      winningLine: line,
      roles: state.roles,
    };
  }
  if (isBoardFull(board)) {
    return { board, status: "draw", winningLine: null, roles: state.roles };
  }

  return {
    board,
    status: "playing",
    winningLine: null,
    roles: state.roles,
  };
}

export function didPlayerWin(state: Pick<GameState, "status" | "roles">): boolean {
  if (state.status === "x-won") return state.roles.playerMark === "X";
  if (state.status === "o-won") return state.roles.playerMark === "O";
  return false;
}

export function didComputerWin(state: Pick<GameState, "status" | "roles">): boolean {
  if (state.status === "x-won") return state.roles.computerMark === "X";
  if (state.status === "o-won") return state.roles.computerMark === "O";
  return false;
}

export function cellAriaLabel(
  row: number,
  col: number,
  value: Cell,
): string {
  const position = `Row ${row + 1}, Column ${col + 1}`;
  if (!value) return `${position}, Empty`;
  return `${position}, ${value}`;
}

export function indexToRowCol(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 3), col: index % 3 };
}

export function rowColToIndex(row: number, col: number): number {
  return row * 3 + col;
}

export function gameResultMessage(
  status: GameStatus,
  roles: GameRoles,
): string | null {
  if (status === "draw") return "Draw.";
  if (didPlayerWin({ status, roles })) return "You win!";
  if (didComputerWin({ status, roles })) return "Computer wins.";
  return null;
}

export function isGameOver(status: GameStatus): boolean {
  return status === "x-won" || status === "o-won" || status === "draw";
}

/** SVG viewBox dimension — square coordinate system for the winning line. */
export const XO_VIEWBOX_SIZE = 300;

/** DOM layering contract for the board winning-line overlay. */
export const XO_WIN_LINE_ARCHITECTURE = {
  viewBoxSize: XO_VIEWBOX_SIZE,
  boardStageClass: "xo-board-stage",
  boardGridClass: "xo-board-grid",
  boardOverlayClass: "xo-board-win-line",
  /** Overlay is a board sibling — never nested inside cell buttons. */
  overlayInsideCell: false as const,
} as const;

export function shouldRenderWinLine(
  winningLine: readonly number[] | null,
  status: GameStatus,
): boolean {
  return (
    winningLine !== null && (status === "x-won" || status === "o-won")
  );
}

/** Matches Tailwind `gap-2` on the XO board (`max-w-[18rem]`). */
export const XO_BOARD_GAP_RATIO = 8 / 288;

/** Extend the strike slightly past each endpoint (~half a cell). */
export const XO_WIN_LINE_EXTENSION_RATIO = 0.5;

export type BoardGridMetrics = {
  gapRatio?: number;
  extensionRatio?: number;
};

export type WinningLineEndpoints = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Path length in SVG viewBox units — used for stroke-dash animation. */
  length: number;
};

/** Cell center in viewBox coordinates, accounting for grid gaps. */
export function cellCenterCoord(
  index: number,
  gapRatio: number = XO_BOARD_GAP_RATIO,
): { x: number; y: number } {
  const { row, col } = indexToRowCol(index);
  const cellSize = (1 - 2 * gapRatio) / 3;
  const axisCenter = (axis: number) =>
    (axis * (cellSize + gapRatio) + cellSize / 2) * XO_VIEWBOX_SIZE;

  return {
    x: axisCenter(col),
    y: axisCenter(row),
  };
}

/** @deprecated Use cellCenterCoord — kept for test compatibility. */
export function cellCenterPercent(
  index: number,
  gapRatio: number = XO_BOARD_GAP_RATIO,
): { x: number; y: number } {
  const center = cellCenterCoord(index, gapRatio);
  return {
    x: (center.x / XO_VIEWBOX_SIZE) * 100,
    y: (center.y / XO_VIEWBOX_SIZE) * 100,
  };
}

/**
 * Winning strike from first → last cell center, extended beyond both ends.
 * Coordinates are in 0–100 viewBox space over the full 3×3 board.
 */
export function getWinningLineEndpoints(
  line: readonly number[],
  metrics: BoardGridMetrics = {},
): WinningLineEndpoints {
  const gapRatio = metrics.gapRatio ?? XO_BOARD_GAP_RATIO;
  const extensionRatio = metrics.extensionRatio ?? XO_WIN_LINE_EXTENSION_RATIO;

  const sorted = [...line].sort((a, b) => a - b);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const start = cellCenterCoord(first, gapRatio);
  const end = cellCenterCoord(last, gapRatio);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const span = Math.hypot(dx, dy);

  if (span === 0) {
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y, length: 0 };
  }

  const cellSize = ((1 - 2 * gapRatio) / 3) * XO_VIEWBOX_SIZE;
  const extension = cellSize * extensionRatio;
  const ux = dx / span;
  const uy = dy / span;

  return {
    x1: start.x - ux * extension,
    y1: start.y - uy * extension,
    x2: end.x + ux * extension,
    y2: end.y + uy * extension,
    length: span + extension * 2,
  };
}

/** Session streak — updates only on terminal game results. */
export function updateStreakOnGameEnd(
  streak: number,
  state: Pick<GameState, "status" | "roles">,
): number {
  if (!isGameOver(state.status)) return streak;
  if (didPlayerWin(state)) return streak + 1;
  return 0;
}

/** Consecutive computer wins across games — mercy mode after two in a row. */
export function updateConsecutiveComputerWins(
  current: number,
  state: Pick<GameState, "status" | "roles">,
): number {
  if (!isGameOver(state.status)) return current;
  if (didComputerWin(state)) return current + 1;
  if (didPlayerWin(state)) return 0;
  return current;
}

export function shouldUseMercyMode(consecutiveComputerWins: number): boolean {
  return consecutiveComputerWins >= 2;
}

export function rolesAssignmentLabel(roles: GameRoles): string {
  return `You: ${roles.playerMark} · AI: ${roles.computerMark}`;
}
