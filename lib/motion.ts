/**
 * ClassFinder V3 motion tokens.
 * Timing ladder: micro 120–180ms, standard 200–300ms, contextual 300–450ms.
 */

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Micro interaction — 150ms */
export const MOTION_MICRO = 0.15;
export const MOTION_MICRO_MS = 150;

/** Standard transition — 250ms */
export const MOTION_STANDARD = 0.25;
export const MOTION_STANDARD_MS = 250;

/** Contextual transition — 375ms */
export const MOTION_CONTEXTUAL = 0.375;
export const MOTION_CONTEXTUAL_MS = 375;

/** Back-compat aliases used by existing V2 components */
export const DURATION_UI = MOTION_STANDARD;
export const DURATION_WIZARD = MOTION_STANDARD;
export const DURATION_PAGE = MOTION_MICRO;

/** Restrained springs — prefer opacity/scale on new V3 work */
export const SPRING_HOVER = {
  type: "spring" as const,
  stiffness: 300,
  damping: 24,
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

/** Button press scale target (~98%) */
export const BUTTON_PRESS_SCALE = 0.98;
