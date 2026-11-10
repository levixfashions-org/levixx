import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __levixPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__levixPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

globalForPrisma.__levixPrisma = prisma;
