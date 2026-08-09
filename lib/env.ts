/**
 * Environment validation (Phase 11) — Zod schema for required server env vars.
 *
 * Fail fast with a clear message when DATABASE_URL / CRON_SECRET are missing
 * or malformed, instead of cryptic Prisma / cron failures later.
 *
 * Import `env` from this module on the server (API routes, Prisma bootstrap,
 * Server Actions). Do not import from Client Components.
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /** PostgreSQL connection string — required for all DB-backed pages. */
  DATABASE_URL: z
    .string({
      required_error:
        "DATABASE_URL is missing. Copy .env.example → .env and set a Postgres URL.",
    })
    .min(1, "DATABASE_URL cannot be empty.")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must start with postgresql:// or postgres://",
    ),

  /**
   * Bearer secret for `/api/cron/expire`.
   * Required in every environment so local curl tests match production auth.
   */
  CRON_SECRET: z
    .string({
      required_error:
        "CRON_SECRET is missing. Copy .env.example → .env and set a long random string.",
    })
    .min(8, "CRON_SECRET must be at least 8 characters."),

  /**
   * Canonical site origin for metadataBase / Open Graph absolute URLs.
   * Optional locally — defaults to http://localhost:3000.
   */
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z
      .string()
      .url(
        "NEXT_PUBLIC_APP_URL must be a valid URL (e.g. https://example.vercel.app)",
      )
      .optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "env";
    return `  • ${path}: ${issue.message}`;
  });
  return [
    "Invalid environment configuration:",
    ...lines,
    "",
    "See .env.example for required variables.",
  ].join("\n");
}

/**
 * Parse and cache validated env. Throws a readable Error on failure so
 * `next build` / `next dev` surfaces missing vars immediately.
 */
function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }

  return parsed.data;
}

const globalForEnv = globalThis as unknown as {
  __srmEnv?: Env;
};

export const env: Env = globalForEnv.__srmEnv ?? loadEnv();

if (process.env.NODE_ENV !== "production") {
  globalForEnv.__srmEnv = env;
}

/** Absolute app origin for Open Graph / canonical URLs. */
export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
