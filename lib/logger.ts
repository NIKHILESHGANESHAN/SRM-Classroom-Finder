/**
 * Structured JSON logger (Phase 11).
 *
 * Emits one JSON object per line so Vercel / platform log drains can parse
 * fields like `event`, `ok`, `durationMs`. Prefer this over ad-hoc console
 * strings for server-side API routes and Server Actions.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<
  string,
  string | number | boolean | null | undefined
>;

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const line = JSON.stringify(payload);

  switch (level) {
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(line);
      }
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  debug: (event: string, fields?: LogFields) => emit("debug", event, fields),
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};
