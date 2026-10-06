import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize the database client.");
}

const createClient = () => new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 }),
  // Opt-in metrics only; never print SQL parameters or connection credentials.
  log: process.env.DB_QUERY_METRICS === "1" ? [{ emit: "event", level: "query" }] : [],
});
const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createClient> | undefined };

/**
 * One Prisma client per process. Reusing it in development prevents each hot
 * reload from creating an additional PostgreSQL connection pool.
 */
export const prisma =
  globalForPrisma.prisma ??
  createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
