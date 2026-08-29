"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SoundLink } from "@/components/sound/sound-link";
import { useSound } from "@/components/sound/sound-provider";
import { MOTION_STANDARD, EASE_OUT_EXPO } from "@/lib/motion";

type SuccessStateProps = {
  roomLabel: string;
  slotLabel: string;
  kind: "created" | "confirmed" | "already_reported";
  onReportAnother: () => void;
};

function headlineForKind(kind: SuccessStateProps["kind"]): string {
  switch (kind) {
    case "confirmed":
      return "Confirmation recorded";
    case "already_reported":
      return "Already on the board";
    default:
      return "Room reported";
  }
}

function bodyForKind(kind: SuccessStateProps["kind"], roomLabel: string): string {
  switch (kind) {
    case "confirmed":
      return `${roomLabel} now has another confirmation from you.`;
    case "already_reported":
      return `You already reported ${roomLabel} for this period today.`;
    default:
      return `${roomLabel} is now visible to students looking for a free classroom.`;
  }
}

/** Restrained post-submit confirmation — no confetti or exaggerated motion. */
export function SuccessState({
  roomLabel,
  slotLabel,
  kind,
  onReportAnother,
}: SuccessStateProps) {
  const { play } = useSound();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_STANDARD, ease: EASE_OUT_EXPO }}
      className="rounded-surface border border-border bg-card px-5 py-8 text-center shadow-token-sm sm:px-8"
    >
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cf-accent-muted text-cf-accent"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path
            d="M6 12.5 L10 16.5 L18 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        {headlineForKind(kind)}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{slotLabel}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-foreground/90">
        {bodyForKind(kind, roomLabel)}
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <SoundLink href="/finder">Find another room</SoundLink>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => {
            play("click");
            onReportAnother();
          }}
        >
          Report another
        </Button>
      </div>
    </motion.div>
  );
}
