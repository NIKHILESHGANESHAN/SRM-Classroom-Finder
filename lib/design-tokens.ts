/**
 * ClassFinder V3 design tokens — typed exports for components.
 * CSS custom properties are defined in app/globals.css.
 */

/** Exactly three glass material variants — no fourth. */
export type GlassVariant = "regular" | "clear" | "prominent";

/** Interaction states for glass surfaces. */
export type GlassState = "default" | "active" | "open";

/** Motion timing ladder (seconds, for Framer Motion). */
export const MOTION_MICRO_S = 0.15;
export const MOTION_STANDARD_S = 0.25;
export const MOTION_CONTEXTUAL_S = 0.375;

/** Motion timing ladder (milliseconds, for CSS). */
export const MOTION_MICRO_MS = 150;
export const MOTION_STANDARD_MS = 250;
export const MOTION_CONTEXTUAL_MS = 375;

export const PRODUCT_NAME = "ClassFinder" as const;
export const PRODUCT_DESCRIPTOR =
  "Find a free classroom at SRM KTR." as const;
