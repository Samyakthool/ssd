// ==========================================================================
// SAMATA SAINIK DAL (SSD) - UNIFIED SUPABASE & POSTGRESQL ADAPTER
// Supports Supabase (PostgreSQL Cloud & JS Client) with Resilient Embedded Fallback
// ==========================================================================

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

let pgPool = null;
let usePostgres = false;
let isSupabasePostgres = false;
export let supabase = null;

// Initialize Supabase Client if URL and Key are provided
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('⚡ [Supabase] JavaScript Client initialized successfully.');
  } catch (err) {
    console.warn('⚠️ [Supabase] Client initialization notice:', err.message);
  }
}

export function isSupabaseConfigured() {
  return !!(supabase || (isSupabasePostgres && usePostgres));
}

export function getDatabaseType() {
  if (isSupabasePostgres && usePostgres) return 'supabase_postgres';
  if (supabase) return 'supabase_api';
  if (usePostgres) return 'postgres';
  return 'embedded';
}

// Embedded Storage Store for resilient local dev
const embeddedStore = {
  roles: new Map(),
  users: new Map(),
  states: new Map(),
  regions: new Map(),
  districts: new Map(),
  talukas: new Map(),
  chapters: new Map(),
  user_jurisdictions: new Map(),
  wings: new Map(),
  approval_workflows: new Map(),
  approval_workflow_steps: new Map(),
  membership_applications: new Map(),
  approval_actions: new Map(),
  members: new Map(),
  donations: new Map(),
  receipts: new Map(),
  events: new Map(),
  event_registrations: new Map(),
  news: new Map(),
  gallery: new Map(),
  leadership: new Map(),
  contact_messages: new Map(),
  audit_logs: new Map(),
  system_settings: new Map()
};

// Persistence file for embedded storage (using /tmp on Vercel)
const LOCAL_DB_FILE = process.env.VERCEL 
  ? '/tmp/data_store.json' 
  : path.join(__dirname, '../../data_store.json');

const BUNDLED_DB_FILE = path.join(__dirname, '../../data_store.json');

function saveEmbeddedStore() {
  try {
    const serialized = {};
    for (const [table, map] of Object.entries(embeddedStore)) {
      serialized[table] = Array.from(map.entries());
    }
    const dataDir = path.dirname(LOCAL_DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local embedded database:', err.message);
  }
}

function loadEmbeddedStore() {
  try {
    let raw = null;
    if (fs.existsSync(LOCAL_DB_FILE)) {
      raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    } else if (fs.existsSync(BUNDLED_DB_FILE)) {
      raw = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8');
    }
    
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [table, entries] of Object.entries(parsed)) {
        if (embeddedStore[table]) {
          embeddedStore[table] = new Map(entries);
        }
      }
    }
  } catch (err) {
    console.warn('Could not read existing local embedded database, starting fresh:', err.message);
  }
}

// Initialize Database (Supabase / PostgreSQL with resilient fallback)
export async function initDb() {
  loadEmbeddedStore();
  
  const rawDbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (rawDbUrl && !rawDbUrl.includes('placeholder')) {
    isSupabasePostgres = rawDbUrl.includes('supabase.co') || rawDbUrl.includes('supabase.com') || rawDbUrl.includes('pooler.supabase.com');
    const ssl = (isProduction || isSupabasePostgres) ? { rejectUnauthorized: false } : false;

    try {
      pgPool = new pg.Pool({
        connectionString: rawDbUrl,
        ssl: ssl,
        connectionTimeoutMillis: 5000
      });
      const client = await pgPool.connect();
      client.release();
      usePostgres = true;
      if (isSupabasePostgres) {
        console.log('⚡ [Database] Connected successfully to Supabase PostgreSQL Database (Cloud).');
      } else {
        console.log('✅ [Database] Connected successfully to PostgreSQL.');
      }
      return;
    } catch (err) {
      if (isSupabasePostgres) {
        console.warn(`⚠️ [Database] Supabase PostgreSQL (${rawDbUrl.split('@')[1] || 'remote'}) unreachable: ${err.message}. Using Resilient Embedded Storage engine.`);
      } else {
        console.warn('⚠️ [Database] PostgreSQL connection not reachable. Using Resilient Embedded Storage engine.');
      }
      usePostgres = false;
    }
  } else if (supabase) {
    console.log('⚡ [Database] Supabase API Client active. Ready for cloud database transactions.');
    usePostgres = false;
  } else {
    console.log('ℹ️ [Database] Supabase / PostgreSQL credentials not supplied. Running in Resilient Embedded mode.');
    usePostgres = false;
  }
}

// Unified Query Function
export async function query(text, params = []) {
  if (usePostgres && pgPool) {
    try {
      const res = await pgPool.query(text, params);
      return res;
    } catch (err) {
      console.error('PostgreSQL Query Error:', err.message, '\nQuery:', text);
      throw err;
    }
  }

  // Execute on Embedded Store for Dev / Offline
  return executeEmbeddedQuery(text, params);
}

// Resilient Embedded SQL Query Engine
function executeEmbeddedQuery(sql, params = []) {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();

  // 1. SELECT queries
  if (lower.startsWith('select')) {
    const fromMatch = trimmed.match(/from\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return { rows: [], rowCount: 0 };
    const tableName = fromMatch[1].toLowerCase();
    const table = embeddedStore[tableName];
    if (!table) return { rows: [], rowCount: 0 };

    let rows = Array.from(table.values()).map(r => ({ ...r }));

    // WHERE clause processing
    const whereMatch = trimmed.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|\s+group\s+by|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      rows = rows.filter(row => evaluateWhere(row, whereClause, params));
    }

    // ORDER BY processing
    const orderMatch = trimmed.match(/order\s+by\s+([a-zA-Z0-9_]+)(?:\s+(asc|desc))?/i);
    if (orderMatch) {
      const field = orderMatch[1];
      const dir = (orderMatch[2] || 'ASC').toUpperCase();
      rows.sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return dir === 'ASC' ? -1 : 1;
        if (valA > valB) return dir === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // LIMIT processing
    const limitMatch = trimmed.match(/limit\s+(\d+|\$\d+)/i);
    if (limitMatch) {
      let limitVal = limitMatch[1];
      if (limitVal.startsWith('$')) {
        const idx = parseInt(limitVal.substring(1), 10) - 1;
        limitVal = params[idx];
      } else {
        limitVal = parseInt(limitVal, 10);
      }
      rows = rows.slice(0, Number(limitVal) || 50);
    }

    return { rows, rowCount: rows.length };
  }

  // 2. INSERT queries
  if (lower.startsWith('insert')) {
    const intoMatch = trimmed.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
    if (!intoMatch) return { rows: [], rowCount: 0 };

    const tableName = intoMatch[1].toLowerCase();
    const cols = intoMatch[2].split(',').map(c => c.trim().toLowerCase());
    const valPlaceholders = intoMatch[3].split(',').map(v => v.trim());

    const table = embeddedStore[tableName];
    if (!table) return { rows: [], rowCount: 0 };

    const newRecord = {};
    cols.forEach((col, idx) => {
      const placeholder = valPlaceholders[idx];
      if (placeholder && placeholder.startsWith('$')) {
        const paramIdx = parseInt(placeholder.substring(1), 10) - 1;
        newRecord[col] = params[paramIdx];
      } else if (placeholder && placeholder.toLowerCase() === 'current_timestamp') {
        newRecord[col] = new Date().toISOString();
      } else {
        newRecord[col] = placeholder ? placeholder.replace(/'/g, '') : null;
      }
    });

    // Ensure timestamps
    if (!newRecord.created_at) newRecord.created_at = new Date().toISOString();
    if (!newRecord.updated_at) newRecord.updated_at = new Date().toISOString();

    const recordId = newRecord.id || newRecord.key || ('id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    newRecord.id = recordId;
    table.set(recordId, newRecord);
    saveEmbeddedStore();

    return { rows: [newRecord], rowCount: 1 };
  }

  // 3. UPDATE queries
  if (lower.startsWith('update')) {
    const updateMatch = trimmed.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.+?)(?:\s+where\s+(.+)|$)/i);
    if (!updateMatch) return { rows: [], rowCount: 0 };

    const tableName = updateMatch[1].toLowerCase();
    const setClause = updateMatch[2];
    const whereClause = updateMatch[3];

    const table = embeddedStore[tableName];
    if (!table) return { rows: [], rowCount: 0 };

    let updatedRows = [];
    for (const [id, record] of table.entries()) {
      if (!whereClause || evaluateWhere(record, whereClause, params)) {
        // Apply sets
        const setPairs = setClause.split(',');
        setPairs.forEach(pair => {
          const [col, valExpr] = pair.split('=').map(s => s.trim());
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
    return { rows: updatedRows, rowCount: updatedRows.length };
  }

  // 4. DELETE queries
  if (lower.startsWith('delete')) {
    const fromMatch = trimmed.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+(.+)|$)/i);
    if (!fromMatch) return { rows: [], rowCount: 0 };

    const tableName = fromMatch[1].toLowerCase();
    const whereClause = fromMatch[2];
    const table = embeddedStore[tableName];
    if (!table) return { rows: [], rowCount: 0 };

    let count = 0;
    for (const [id, record] of table.entries()) {
      if (!whereClause || evaluateWhere(record, whereClause, params)) {
        table.delete(id);
        count++;
      }
    }
    saveEmbeddedStore();
    return { rows: [], rowCount: count };
  }

  return { rows: [], rowCount: 0 };
}

// WHERE Clause evaluator helper
function evaluateWhere(row, whereClause, params) {
  if (!whereClause) return true;
  
  // Split AND conditions
  const conditions = whereClause.split(/\s+and\s+/i);
  for (const cond of conditions) {
    const cleanCond = cond.trim().replace(/^\(|\)$/g, '');
    
    // Check equality
    const eqMatch = cleanCond.match(/([a-zA-Z0-9_]+)\s*=\s*(\$[0-9]+|'[^']*'|[0-9]+)/i);
    if (eqMatch) {
      const field = eqMatch[1].toLowerCase();
      let targetVal = eqMatch[2];
      if (targetVal.startsWith('$')) {
        const paramIdx = parseInt(targetVal.substring(1), 10) - 1;
        targetVal = params[paramIdx];
      } else {
        targetVal = targetVal.replace(/'/g, '');
      }

      const rowVal = row[field];
      if (String(rowVal).toLowerCase() !== String(targetVal).toLowerCase()) {
        return false;
      }
      continue;
    }

    // Check IN clause
    const inMatch = cleanCond.match(/([a-zA-Z0-9_]+)\s+in\s*\(([^)]+)\)/i);
    if (inMatch) {
      const field = inMatch[1].toLowerCase();
      const inValues = inMatch[2].split(',').map(v => {
        v = v.trim();
        if (v.startsWith('$')) {
          const idx = parseInt(v.substring(1), 10) - 1;
          return String(params[idx]).toLowerCase();
        }
        return v.replace(/'/g, '').toLowerCase();
      });
      if (!inValues.includes(String(row[field] ?? '').toLowerCase())) {
        return false;
      }
      continue;
    }

    // Check ILIKE / LIKE
    const likeMatch = cleanCond.match(/([a-zA-Z0-9_]+)\s+(?:ilike|like)\s*(\$[0-9]+|'[^']*')/i);
    if (likeMatch) {
      const field = likeMatch[1].toLowerCase();
      let targetPattern = likeMatch[2];
      if (targetPattern.startsWith('$')) {
        const idx = parseInt(targetPattern.substring(1), 10) - 1;
        targetPattern = String(params[idx] || '');
      } else {
        targetPattern = targetPattern.replace(/'/g, '');
      }
      const rawText = targetPattern.replace(/%/g, '').toLowerCase();
      const rowVal = String(row[field] || '').toLowerCase();
      if (!rowVal.includes(rawText)) {
        return false;
      }
      continue;
    }
  }

  return true;
}

export { embeddedStore, saveEmbeddedStore };
