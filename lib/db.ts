import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL environment variable");
  }
  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    max: 10,
    min: 2,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 5000,
  });
}

// Lazy singleton — pool is created on first access, not at import time.
// This prevents build errors when DATABASE_URL is not set at build time.
function getPool(): Pool {
  if (!globalThis._pgPool) {
    globalThis._pgPool = createPool();
  }
  return globalThis._pgPool;
}

export const pool = {
  query: (...args: Parameters<Pool["query"]>) => getPool().query(...(args as Parameters<Pool["query"]>)),
  connect: () => getPool().connect(),
  end: () => getPool().end(),
} as unknown as Pool;

