import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// PrismaTransaction is typed loosely since Prisma 7 changed the internal types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrismaTransaction = any;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ['error'] });
}

// Use a getter so the client is only created when first accessed, not at import time
const globalForPrisma = globalThis as unknown as { _prisma?: PrismaClient };

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    const client = globalForPrisma._prisma;
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
