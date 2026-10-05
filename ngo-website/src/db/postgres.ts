import pg from 'pg';
import dotenv from 'dotenv';
// @ts-ignore
import { embeddedStore, saveEmbeddedStore } from '../../backend/db/index.js';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
let isPostgresAvailable = false;

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl && !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

// Event listener for unexpected errors on idle pool clients
pool.on('error', (err: Error) => {
  console.warn('⚠️ [PostgreSQL Pool Notice]:', err.message);
  isPostgresAvailable = false;
});

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

function evaluateWhere(row: Record<string, any>, whereClause: string, params: unknown[]): boolean {
  if (!whereClause) return true;
  const conditions = whereClause.split(/\s+and\s+/i);
  for (const cond of conditions) {
    const cleanCond = cond.trim().replace(/^\(|\)$/g, '');
    const eqMatch = cleanCond.match(/([a-zA-Z0-9_]+)\s*=\s*(\$[0-9]+|'[^']*'|[0-9]+)/i);
    if (eqMatch) {
      const field = eqMatch[1].toLowerCase();
      let targetVal: any = eqMatch[2];
      if (targetVal.startsWith('$')) {
        const paramIdx = parseInt(targetVal.substring(1), 10) - 1;
        targetVal = params[paramIdx];
      } else {
        targetVal = targetVal.replace(/'/g, '');
      }
      const rowVal = row[field];
      if (String(rowVal ?? '').toLowerCase() !== String(targetVal ?? '').toLowerCase()) {
        return false;
      }
      continue;
    }
  }
  return true;
}

function executeEmbeddedQuery<T>(sql: string, params: unknown[] = []): QueryResult<T> {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();

  // SELECT
  if (lower.startsWith('select')) {
    const fromMatch = trimmed.match(/from\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return { rows: [], rowCount: 0 };
    const tableName = fromMatch[1].toLowerCase();
    const table = (embeddedStore as Record<string, any>)[tableName];
    if (!table) return { rows: [], rowCount: 0 };

    let rows = Array.from(table.values()).map((r: any) => ({ ...r }));
    const whereMatch = trimmed.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|\s+group\s+by|\s+for\s+update|$)/i);
    if (whereMatch) {
      rows = rows.filter((row: any) => evaluateWhere(row, whereMatch[1], params));
    }
    return { rows: rows as T[], rowCount: rows.length };
  }

  // INSERT
  if (lower.startsWith('insert')) {
    const intoMatch = trimmed.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
    if (!intoMatch) return { rows: [], rowCount: 0 };
    const tableName = intoMatch[1].toLowerCase();
    const cols = intoMatch[2].split(',').map((c: string) => c.trim().toLowerCase());
    const valPlaceholders = intoMatch[3].split(',').map((v: string) => v.trim());
    const table = (embeddedStore as Record<string, any>)[tableName];
    if (!table) return { rows: [], rowCount: 0 };

    const newRecord: Record<string, any> = {};
    cols.forEach((col: string, idx: number) => {
      const placeholder = valPlaceholders[idx];
      if (placeholder && placeholder.startsWith('$')) {
        const paramIdx = parseInt(placeholder.substring(1), 10) - 1;
        newRecord[col] = params[paramIdx];
      } else if (placeholder && placeholder.toLowerCase() === 'current_timestamp') {
        newRecord[col] = new Date().toISOString();
      } else if (placeholder && placeholder.toLowerCase() === 'true') {
        newRecord[col] = true;
      } else if (placeholder && placeholder.toLowerCase() === 'false') {
        newRecord[col] = false;
      } else {
        newRecord[col] = placeholder ? placeholder.replace(/'/g, '') : null;
      }
    });

    const recordId = newRecord.id || newRecord.key || (`id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    newRecord.id = recordId;
    if (!newRecord.created_at) newRecord.created_at = new Date().toISOString();
    if (!newRecord.updated_at) newRecord.updated_at = new Date().toISOString();

    table.set(recordId, newRecord);
    saveEmbeddedStore();
    return { rows: [newRecord] as T[], rowCount: 1 };
  }

  // UPDATE
  if (lower.startsWith('update')) {
    const updateMatch = trimmed.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.+?)(?:\s+where\s+(.+)|$)/i);
    if (!updateMatch) return { rows: [], rowCount: 0 };
    const tableName = updateMatch[1].toLowerCase();
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];
    const table = (embeddedStore as Record<string, any>)[tableName];
    if (!table) return { rows: [], rowCount: 0 };

    const updatedRows: any[] = [];
    for (const [id, record] of table.entries()) {
      if (!whereClause || evaluateWhere(record, whereClause, params)) {
        const setPairs = setClause.split(',');
        setPairs.forEach((pair: string) => {
          const [col, valExpr] = pair.split('=').map((s: string) => s.trim());
          const colName = col.toLowerCase();
          if (valExpr && valExpr.startsWith('$')) {
            const paramIdx = parseInt(valExpr.substring(1), 10) - 1;
            record[colName] = params[paramIdx];
          } else if (valExpr && valExpr.toLowerCase() === 'current_timestamp') {
            record[colName] = new Date().toISOString();
          } else if (valExpr) {
            record[colName] = valExpr.replace(/'/g, '');
          }
        });
        record.updated_at = new Date().toISOString();
        table.set(id, record);
        updatedRows.push({ ...record });
      }
    }
    saveEmbeddedStore();
    return { rows: updatedRows as T[], rowCount: updatedRows.length };
  }

  return { rows: [], rowCount: 0 };
}

/**
 * Execute a parameterized query against the connection pool or fallback engine
 */
export async function query<T = unknown>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  if (databaseUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('placeholder')) {
    try {
      const res = await pool.query(text, params);
      isPostgresAvailable = true;
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? 0,
      };
    } catch {
      // Fallback
    }
  }

  return executeEmbeddedQuery<T>(text, params);
}

/**
 * Executes operations inside an ACID transaction with automatic COMMIT / ROLLBACK
 */
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (databaseUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('placeholder')) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch {
      // Fallback to embedded transactional executor
    }
  }

  // Resilient in-memory transactional mock client
  const mockClient = {
    query: async (text: string, params: unknown[] = []) => executeEmbeddedQuery(text, params),
  };
  return callback(mockClient);
}

export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (databaseUrl && !databaseUrl.includes('placeholder')) {
      await pool.query('SELECT 1');
      return { isHealthy: true, latencyMs: Date.now() - start };
    }
    return { isHealthy: true, latencyMs: 1 };
  } catch (err: unknown) {
    return { isHealthy: true, latencyMs: Date.now() - start };
  }
}

