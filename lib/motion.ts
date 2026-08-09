/**
 * Shared motion tokens (Section 7).
 * Keep Framer Motion configs consistent across landing / finder / contribute / stats.
 */

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Most UI micro-interactions */
export const DURATION_UI = 0.28;

/** Wizard / modal-ish mid transitions (~250ms) */
export const DURATION_WIZARD = 0.25;

/** Page-level cross-fades */
export const DURATION_PAGE = 0.2;

export const SPRING_HOVER = {
  type: "spring" as const,
  stiffness: 300,
  damping: 20,
};

export const SPRING_PILL = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
};

export const SPRING_BADGE = {
  type: "spring" as const,
  stiffness: 420,
  damping: 22,
};
