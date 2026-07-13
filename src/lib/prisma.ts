import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton de Prisma.
// En desarrollo Next.js recarga los módulos en caliente y, sin este cache,
// se abriría una conexión nueva en cada recarga hasta agotar el pool. Por eso
// guardamos la instancia en globalThis fuera de producción.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Prisma 7 usa driver adapters: la conexión la maneja `pg`, no un engine
  // binario. DATABASE_URL apunta al pooler de Supabase (ver .env.example).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
