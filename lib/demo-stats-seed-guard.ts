/**
 * Guard for scripts/seed-stats-data.ts — DEVELOPMENT/DEMO ONLY.
 */

export function shouldRefuseDemoStatsSeed(env: {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  ALLOW_DEMO_STATS_SEED?: string;
}): string | null {
  if (env.ALLOW_DEMO_STATS_SEED === "true") return null;
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    return "Refusing demo stats seed in production. This script is DEVELOPMENT/DEMO ONLY.";
  }
  return null;
}
