import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateApplicationNo, generateSainikId, generateQrToken } from '../db/index.js';
import { getSupabaseAdmin } from '../db/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

async function assert(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(` ✅ PASS: ${name}`);
    passed++;
  } catch (err: unknown) {
    const error = err as Error;
    console.error(` ❌ FAIL: ${name} ->`, error.message);
    failed++;
  }
}

async function runDatabaseSuite() {
  console.log('\n==========================================================================');
  console.log(' 🗄️  PHASE 3: SUPABASE POSTGRESQL & SCHEMA INTEGRITY SUITE');
  console.log('==========================================================================\n');

  // 1. Secure Identifier Generation Tests
  await assert('Application Number Generator produces non-sequential cryptographic Base32 IDs', () => {
    const appNo1 = generateApplicationNo();
    const appNo2 = generateApplicationNo();
    const regex = /^SSD-\d{4}-[2-9A-HJ-NP-Z]{6}$/;

    if (!regex.test(appNo1)) throw new Error(`Generated app number ${appNo1} does not match expected format`);
    if (!regex.test(appNo2)) throw new Error(`Generated app number ${appNo2} does not match expected format`);
    if (appNo1 === appNo2) throw new Error('Colliding application numbers generated!');
  });

  await assert('Sainik Cadre ID Generator produces deterministic zero-padded territorial identifiers', () => {
    const sainikId = generateSainikId('MH', 'NGP', 1245);
    if (sainikId !== 'SSD-MH-NGP-001245') {
      throw new Error(`Expected 'SSD-MH-NGP-001245', got '${sainikId}'`);
    }
  });

  await assert('QR Token Generator produces 64-character SHA-256 HMAC cryptographic tokens', () => {
    const token = generateQrToken('SSD-MH-NGP-001245');
    if (!token || token.length !== 64) {
      throw new Error(`Expected 64-character hex HMAC, got length ${token?.length}`);
    }
  });

  // 2. Migration DDL Files Verification
  await assert('Migration 001 defines all required relational tables and constraints', () => {
    const migration1Path = path.join(__dirname, '../../supabase/migrations/001_initial_schema.sql');
    if (!fs.existsSync(migration1Path)) throw new Error('001_initial_schema.sql missing');
    const content = fs.readFileSync(migration1Path, 'utf-8');

    const expectedTables = [
      'roles',
      'permissions',
      'role_permissions',
      'users',
      'states',
      'regions',
      'districts',
      'talukas',
      'chapters',
      'user_jurisdictions',
      'wings',
      'approval_workflows',
      'approval_workflow_steps',
      'membership_applications',
      'approval_history',
      'members',
      'member_documents',
      'donations',
      'receipts',
      'events',
      'news',
      'gallery',
      'leadership',
      'audit_logs',
      'security_events',
      'system_settings',
    ];

    for (const table of expectedTables) {
      if (!content.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
        throw new Error(`Expected table '${table}' in migration 001`);
      }
    }

    if (!content.includes('FOREIGN KEY') && !content.includes('REFERENCES')) {
      throw new Error('Foreign key referential constraints missing from migration 001');
    }
    if (!content.includes('idx_applications_status')) {
      throw new Error('Performance indexes missing from migration 001');
    }
  });

  await assert('Migration 002 enforces Row Level Security and immutable audit tamper triggers', () => {
    const migration2Path = path.join(__dirname, '../../supabase/migrations/002_rls_and_security.sql');
    if (!fs.existsSync(migration2Path)) throw new Error('002_rls_and_security.sql missing');
    const content = fs.readFileSync(migration2Path, 'utf-8');

    if (!content.includes('ENABLE ROW LEVEL SECURITY')) {
      throw new Error('RLS enablement statements missing');
    }
    if (!content.includes('trg_prevent_audit_logs_tampering')) {
      throw new Error('Audit log tamper prevention trigger missing');
    }
    if (!content.includes('trg_prevent_approval_history_tampering')) {
      throw new Error('Approval history tamper prevention trigger missing');
    }
  });

  await assert('Migration 003 provisions official roles, territorial states, and 6-tier approval workflow', () => {
    const migration3Path = path.join(__dirname, '../../supabase/migrations/003_seed_data.sql');
    if (!fs.existsSync(migration3Path)) throw new Error('003_seed_data.sql missing');
    const content = fs.readFileSync(migration3Path, 'utf-8');

    if (!content.includes("'super_admin'") || !content.includes("'district_official'")) {
      throw new Error('Roles missing from migration 003');
    }
    if (!content.includes("'state_mh'") || !content.includes("'Nagpur'")) {
      throw new Error('Territorial states/districts missing from migration 003');
    }
    if (!content.includes('step_1_chapter') || !content.includes('step_6_central')) {
      throw new Error('6-tier approval workflow steps missing from migration 003');
    }
  });

  // 3. Supabase Adapter Verification
  await assert('Supabase server adapter initializes cleanly without runtime exceptions', () => {
    const admin = getSupabaseAdmin();
    // In local dev without live credentials, admin may be null or fallback, but must never throw unhandled exception
    console.log(`   ℹ️ [Supabase Client Status]: ${admin ? 'Connected' : 'Environment ready for Supabase credentials'}`);
  });

  console.log('\n==========================================================================');
  console.log(` 🏁 DATABASE TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDatabaseSuite();
