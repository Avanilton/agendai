import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type AgendaiDatabase = NeonHttpDatabase<typeof schema>;

let cachedDb: AgendaiDatabase | null = null;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Lazy Neon + Drizzle client.
 * Safe at Next.js build time even when DATABASE_URL is not yet provisioned.
 */
export function getDb(): AgendaiDatabase {
  if (cachedDb) {
    return cachedDb;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Defina DATABASE_URL no .env.local ou provisione o Neon na Vercel."
    );
  }

  const sql = neon(connectionString);
  cachedDb = drizzle(sql, { schema });
  return cachedDb;
}

