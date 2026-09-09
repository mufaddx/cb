import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads / lambda invocations
// instead of exhausting MySQL connections.
declare global {
  // eslint-disable-next-line no-var
  var __antigravityPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__antigravityPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__antigravityPrisma = prisma;
}
