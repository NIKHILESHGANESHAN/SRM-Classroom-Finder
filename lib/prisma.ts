import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma client singleton for Next.js.
 * Avoids exhausting DB connections during hot-reload in development
 * (each reload would otherwise construct a new PrismaClient).
 *
 * Importing `env` here fails fast if DATABASE_URL / CRON_SECRET are invalid.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: env.DATABASE_URL },
    },
    log:
      env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
