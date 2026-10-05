import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl && !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
  max: 20, // Max clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Event listener for unexpected errors on idle pool clients
pool.on('error', (err: Error) => {
  console.error('⚠️ [PostgreSQL Pool Error]:', err.message);
});

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Execute a parameterized query against the connection pool
 */
export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️ [Slow Query] (${duration}ms): ${text.substring(0, 100)}...`);
    }
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? 0,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`❌ [DB Query Error]: ${error.message} \nQuery: ${text}`);
    throw error;
  }
}

/**
 * Executes operations inside an ACID transaction with automatic COMMIT / ROLLBACK
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('⚠️ [Transaction Rolled Back]:', (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { isHealthy: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    return { isHealthy: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}
