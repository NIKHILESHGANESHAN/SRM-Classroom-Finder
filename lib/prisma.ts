import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton for Next.js.
 * Avoids exhausting DB connections during hot-reload in development
 * (each reload would otherwise construct a new PrismaClient).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
