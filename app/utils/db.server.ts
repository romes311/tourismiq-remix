import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
export const prisma =
  globalForPrisma.prisma ??
  (() => {
    if (process.env.NODE_ENV === "production") {
      return new PrismaClient();
    } else {
      const client = new PrismaClient();
      globalForPrisma.prisma = client;
      client.$connect();
      return client;
    }
  })();
