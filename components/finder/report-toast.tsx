"use client";

import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { EASE_OUT_EXPO } from "@/lib/motion";

function ToastCheckmark() {
  const reduceMotion = useReducedMotion();

  return (
    <span className="relative mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
      <svg viewBox="0 0 52 52" className="h-3.5 w-3.5" aria-hidden>
        <motion.path
          d="M14 27 L22 35 L38 17"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={
            reduceMotion
              ? { pathLength: 1, opacity: 1, scale: 1 }
              : { pathLength: 0, opacity: 0, scale: 0.6 }
          }
          animate={{ pathLength: 1, opacity: 1, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.05 }
          }
          style={{ originX: 0.5, originY: 0.5 }}
        />
      </svg>
      {!reduceMotion && (
        <motion.span
          className="absolute inset-0 rounded-full bg-emerald-500/25"
          initial={{ scale: 0.4, opacity: 0.7 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          aria-hidden
        />
      )}
    </span>
  );
}

type ReportToastKind = "created" | "already_reported" | "hidden";

/**
 * Success / duplicate toast with a small checkmark burst (Section 7).
 */
export function showReportToast(kind: ReportToastKind, roomLabel: string) {
  const title =
    kind === "already_reported"
      ? "Already reported"
      : kind === "hidden"
        ? "Room hidden"
        : "Thanks — report sent";

  const description =
    kind === "already_reported"
      ? `You already flagged ${roomLabel} from this device.`
      : kind === "hidden"
        ? `${roomLabel} reached 2 reports and was removed from the list.`
        : `${roomLabel} was flagged. Thanks for keeping Finder accurate.`;

  toast.success(title, {
    description,
    icon: <ToastCheckmark />,
  });
}
