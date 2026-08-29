"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { glassSurfaceClasses } from "@/lib/glass";
import { useSound } from "@/components/sound/sound-provider";
import {
  alternatePlayerMark,
  applyComputerMove,
  applyPlayerMove,
  cellAriaLabel,
  createInitialGameState,
  didPlayerWin,
  gameResultMessage,
  getWinningLineEndpoints,
  indexToRowCol,
  isGameOver,
  pickRandomStarter,
  rolesAssignmentLabel,
  rowColToIndex,
  shouldRenderWinLine,
  shouldUseMercyMode,
  updateConsecutiveComputerWins,
  updateStreakOnGameEnd,
  XO_COMPUTER_THINK_MS,
  XO_VIEWBOX_SIZE,
  XO_WIN_LINE_ARCHITECTURE,
  type GameState,
  type GameStatus,
  type Mark,
} from "@/lib/xo-game";
import { cn } from "@/lib/utils";

const COMPUTER_THINK_MS = XO_COMPUTER_THINK_MS;

type XoGameProps = {
  className?: string;
  streak: number;
  onStreakChange: (streak: number) => void;
};

function statusLabel(status: GameStatus, playerMark: Mark): string {
  switch (status) {
    case "playing":
      return `Your turn — you are ${playerMark}`;
    case "computer-thinking":
      return "Computer is thinking…";
    case "x-won":
    case "o-won":
    case "draw":
      return "";
    default:
      return "";
  }
}

export function XoGame({ className, streak, onStreakChange }: XoGameProps) {
  const { play } = useSound();
  const resultId = useId();
  const [playerMark, setPlayerMark] = useState<Mark>("X");
  const [state, setState] = useState<GameState>(() =>
    createInitialGameState("X", pickRandomStarter()),
  );
  const [focusedIndex, setFocusedIndex] = useState(0);
  const sessionRef = useRef(0);
  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveComputerWinsRef = useRef(0);
  const mercyModeRef = useRef(false);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const streakAppliedRef = useRef(false);
  const gameSoundPlayedRef = useRef(false);
  const prevStatusRef = useRef<GameState["status"]>(state.status);

  const clearThinkTimer = useCallback(() => {
    if (thinkTimerRef.current !== null) {
      clearTimeout(thinkTimerRef.current);
      thinkTimerRef.current = null;
    }
  }, []);

  const scheduleComputerMove = useCallback(
    (session: number) => {
      clearThinkTimer();
      thinkTimerRef.current = setTimeout(() => {
        thinkTimerRef.current = null;
        if (session !== sessionRef.current) return;
        setState((prev) => {
          if (prev.status !== "computer-thinking") return prev;
          const next = applyComputerMove(prev, { mercy: mercyModeRef.current });
          return next ?? prev;
        });
      }, COMPUTER_THINK_MS);
    },
    [clearThinkTimer],
  );

  const prepareNewGame = useCallback(
    (mark: Mark, advanceSession: boolean) => {
      if (advanceSession) sessionRef.current += 1;
      clearThinkTimer();
      streakAppliedRef.current = false;
      mercyModeRef.current = shouldUseMercyMode(consecutiveComputerWinsRef.current);
      const initial = createInitialGameState(mark, pickRandomStarter());
      setPlayerMark(mark);
      setState(initial);
      setFocusedIndex(0);
      return initial;
    },
    [clearThinkTimer],
  );

  const startGame = useCallback(
    (mark: Mark, advanceSession = true) => {
      play("click");
      const initial = prepareNewGame(mark, advanceSession);
      if (initial.status === "computer-thinking") {
        scheduleComputerMove(sessionRef.current);
      }
    },
    [prepareNewGame, scheduleComputerMove, play],
  );

  const restartSameAssignment = useCallback(() => {
    startGame(playerMark, true);
  }, [playerMark, startGame]);

  const playAgainNextAssignment = useCallback(() => {
    startGame(alternatePlayerMark(playerMark), true);
  }, [playerMark, startGame]);

  const playMove = useCallback(
    (index: number) => {
      if (state.status !== "playing") return;
      const next = applyPlayerMove(state, index);
      if (!next) return;

      const session = sessionRef.current;
      play("gameMove");
      setState(next);
      setFocusedIndex(index);

      if (next.status === "computer-thinking") {
        scheduleComputerMove(session);
      }
    },
    [state, scheduleComputerMove, play],
  );

  useEffect(() => () => clearThinkTimer(), [clearThinkTimer]);

  /** Ensures computer-starting games always schedule exactly one AI move. */
  useEffect(() => {
    if (state.status !== "computer-thinking") return;
    if (thinkTimerRef.current !== null) return;
    scheduleComputerMove(sessionRef.current);
  }, [state.status, scheduleComputerMove]);

  useEffect(() => {
    cellRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  useEffect(() => {
    if (
      prevStatusRef.current === "computer-thinking" &&
      state.status !== "computer-thinking"
    ) {
      play("gameMove");
    }
    prevStatusRef.current = state.status;
  }, [state.status, play]);

  useEffect(() => {
    if (!isGameOver(state.status)) {
      gameSoundPlayedRef.current = false;
      return;
    }
    if (gameSoundPlayedRef.current) return;
    gameSoundPlayedRef.current = true;

    if (state.status === "draw") {
      play("gameDraw");
      return;
    }
    if (didPlayerWin(state)) {
      play("gameWin");
      return;
    }
    play("gameLose");
  }, [state, play]);

  useEffect(() => {
    if (!isGameOver(state.status)) {
      streakAppliedRef.current = false;
      return;
    }
    if (streakAppliedRef.current) return;
    streakAppliedRef.current = true;
    consecutiveComputerWinsRef.current = updateConsecutiveComputerWins(
      consecutiveComputerWinsRef.current,
      state,
    );
    onStreakChange(updateStreakOnGameEnd(streak, state));
  }, [state, streak, onStreakChange]);

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const { row, col } = indexToRowCol(index);

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setFocusedIndex(rowColToIndex(row, (col + 1) % 3));
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setFocusedIndex(rowColToIndex(row, (col + 2) % 3));
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedIndex(rowColToIndex((row + 1) % 3, col));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIndex(rowColToIndex((row + 2) % 3, col));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      playMove(index);
    }
  };

  const resultMessage = gameResultMessage(state.status, state.roles);
  const gameEnded = isGameOver(state.status);
  const cellsDisabled = state.status !== "playing";
  const showWinLine = shouldRenderWinLine(state.winningLine, state.status);
  const winLine = showWinLine
    ? getWinningLineEndpoints(state.winningLine!)
    : null;

  const { boardStageClass, boardGridClass, boardOverlayClass } =
    XO_WIN_LINE_ARCHITECTURE;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-foreground">
          {rolesAssignmentLabel(state.roles)}
        </p>
        <p
          className="text-sm font-semibold text-foreground"
          aria-label={`Current win streak: ${streak}`}
        >
          <span aria-hidden>🔥</span> Streak: {streak}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p
          className="text-sm font-medium text-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusLabel(state.status, state.roles.playerMark)}
        </p>
        {state.status === "computer-thinking" ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden
          />
        ) : null}
      </div>

      <div
        className={cn(
          boardStageClass,
          "relative mx-auto w-full max-w-[min(100%,18rem)] overflow-visible",
        )}
      >
        <div
          className={cn(boardGridClass, "relative z-0 grid grid-cols-3 gap-2")}
          role="grid"
          aria-label="Tic-tac-toe board"
        >
          {state.board.map((value, index) => {
            const { row, col } = indexToRowCol(index);
            const isWinner = state.winningLine?.includes(index) ?? false;
            const occupied = value !== null;
            const disabled = cellsDisabled || occupied;

            return (
              <button
                key={index}
                ref={(node) => {
                  cellRefs.current[index] = node;
                }}
                type="button"
                role="gridcell"
                aria-label={cellAriaLabel(row, col, value)}
                aria-disabled={disabled}
                disabled={disabled}
                tabIndex={focusedIndex === index ? 0 : -1}
                onFocus={() => setFocusedIndex(index)}
                onClick={() => playMove(index)}
                onKeyDown={(event) => handleCellKeyDown(event, index)}
                className={cn(
                  "xo-cell btn-press z-0 flex aspect-square items-center justify-center rounded-button text-3xl font-semibold sm:text-4xl",
                  glassSurfaceClasses({ variant: "clear" }),
                  "border border-border/80 transition-standard motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  !disabled &&
                    !occupied &&
                    "hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98]",
                  value === "X" && "text-cf-accent",
                  value === "O" && "text-muted-foreground",
                  isWinner && "xo-cell--winner border-primary bg-primary/10",
                  disabled && !occupied && "cursor-not-allowed opacity-60",
                )}
              >
                <span
                  className={cn(
                    "select-none",
                    value &&
                      "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-none",
                  )}
                  aria-hidden={!value}
                >
                  {value ?? ""}
                </span>
              </button>
            );
          })}
        </div>

        {winLine ? (
          <div
            className={cn(boardOverlayClass, "pointer-events-none absolute inset-0 z-20 overflow-visible")}
            aria-hidden
          >
            <svg
              className="xo-win-line h-full w-full overflow-visible"
              viewBox={`0 0 ${XO_VIEWBOX_SIZE} ${XO_VIEWBOX_SIZE}`}
              preserveAspectRatio="none"
            >
              <line
                x1={winLine.x1}
                y1={winLine.y1}
                x2={winLine.x2}
                y2={winLine.y2}
                pathLength={1}
                className="xo-win-line__stroke"
              />
            </svg>
          </div>
        ) : null}
      </div>

      {resultMessage ? (
        <p
          id={resultId}
          role="status"
          className="text-center text-base font-semibold text-foreground"
        >
          {resultMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="min-h-11 w-full sm:w-auto"
          onClick={gameEnded ? playAgainNextAssignment : restartSameAssignment}
        >
          {gameEnded ? "Play again" : "New game"}
        </Button>
      </div>
    </div>
  );
}

export const XO_GAME_THINK_MS = COMPUTER_THINK_MS;
