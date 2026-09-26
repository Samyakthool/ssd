// ==========================================================================
// SAMATA SAINIK DAL (SSD) - SUPABASE MIGRATION & SEEDING SCRIPT
// Executes production schema and seeds relational data into Supabase Cloud
// ==========================================================================

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

console.log(`\n==========================================================================`);
console.log(` ⚡ SAMATA SAINIK DAL - SUPABASE DATABASE MIGRATION ENGINE`);
console.log(`==========================================================================\n`);

async function runSupabaseMigration() {
  if (!databaseUrl || databaseUrl.includes('placeholder') || databaseUrl.includes('localhost:5432')) {
    console.log(`ℹ️ [Supabase Setup] Ready to connect to your Supabase Project.`);
    console.log(`\n📋 HOW TO CONNECT YOUR SUPABASE DATABASE:`);
    console.log(`1. Go to https://supabase.com and create/open your project.`);
    console.log(`2. Navigate to Project Settings -> Database -> Connection string (URI).`);
    console.log(`3. Choose 'Session pooler' (port 6543) or 'Direct connection' (port 5432).`);
    console.log(`4. In your .env file, update DATABASE_URL with your Supabase connection string:`);
    console.log(`   DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`);
    console.log(`5. Add your Supabase project API keys in .env:`);
    console.log(`   SUPABASE_URL=https://[project-ref].supabase.co`);
    console.log(`   SUPABASE_ANON_KEY=[your-anon-key]`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]`);
    console.log(`\n6. Run: npm run migrate:supabase`);
    console.log(`This will automatically create all 17 tables, indexes, roles, states, districts, talukas, and super admin accounts in Supabase!\n`);
    process.exit(0);
  }

  const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('supabase.com') || databaseUrl.includes('pooler.supabase.com');
  console.log(` Connecting to: ${isSupabase ? 'Supabase PostgreSQL Cloud' : 'PostgreSQL Server'}...`);

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ Connected successfully to Supabase PostgreSQL Database!\n`);

    // 1. Read & Execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    console.log(` Applying schema DDL from schema.sql...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log(`✅ All tables, foreign keys, and indexes established in Supabase.\n`);

    // 2. Hash default admin passwords
    const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
    const superAdminPasswordHash = hashPassword('SSD1927');

    // 3. Seed Roles
    console.log(` Seeding command hierarchy roles...`);
    const roles = [
      ['super_admin', 'Supreme Administrator', 'Complete unrestricted system access', 7],
      ['central_admin', 'Central Command Official', 'National executive and final approval authority', 6],
      ['state_official', 'State Directorate Official', 'State-level oversight and intermediate review', 5],
      ['regional_official', 'Regional Commander', 'Regional division review and coordination', 4],
      ['district_official', 'District Dalpati / Officer', 'District verification and recommendation', 3],
      ['taluka_official', 'Taluka Executive Officer', 'Taluka/Sub-district level verification', 2],
      ['chapter_official', 'Local Chapter Commander', 'Grassroots chapter verification', 1],
      ['enlistment_officer', 'Enlistment Approval Officer', 'Authorized exclusively for enlistment scrutiny, rubric scoring, and approvals', 4],
      ['finance_admin', 'Finance & Treasury Admin', 'Donation, 80G tax receipt, and financial audit management', 5],
      ['media_admin', 'Media & Gazette Admin', 'News, events, press releases, and photo archives', 4],
      ['member', 'Enlisted Sainik / Cadet', 'Standard verified member portal access', 0]
    ];

    for (const [id, name, desc, level] of roles) {
      await client.query(`
        INSERT INTO roles (id, name, description, hierarchy_level)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, hierarchy_level = $4
      `, [id, name, desc, level]);
    }

    // 4. Seed States
    console.log(` Seeding territorial states...`);
    const states = [
      ['state_mh', 'Maharashtra', 'महाराष्ट्र', 'महाराष्ट्र', 'MH', 'Nagpur & Mumbai Directorate', 'Commander Pramod R. Moon', 'Adv. Nitin V. Dongre', 'ACTIVE', 1],
      ['state_dl', 'Delhi NCR', 'दिल्ली एनसीआर', 'दिल्ली', 'DL', 'Central Secretariat, New Delhi', 'Col. (Retd.) V. A. Thorat', 'Dr. Sunita Gautam', 'ACTIVE', 2],
      ['state_up', 'Uttar Pradesh', 'उत्तर प्रदेश', 'उत्तर प्रदेश', 'UP', 'Lucknow State HQ', 'Commander Rameshwar Prasad', 'Adv. V. K. Anand', 'ACTIVE', 3],
      ['state_mp', 'Madhya Pradesh', 'मध्य प्रदेश', 'मध्य प्रदेश', 'MP', 'Bhopal Directorate', 'Dr. B. K. Thorat', 'Sainik Anand Rao', 'ACTIVE', 4],
      ['state_br', 'Bihar', 'बिहार', 'बिहार', 'BR', 'Patna Command', 'Dharmendra Kumar Paswan', 'Rajesh Kumar Baitha', 'ACTIVE', 5],
      ['state_ka', 'Karnataka', 'कर्नाटक', 'कर्नाटक', 'KA', 'Bengaluru Command', 'Sainik Mallikarjun Swamy', 'Adv. Suresh Babu', 'ACTIVE', 6],
      ['state_rj', 'Rajasthan', 'राजस्थान', 'राजस्थान', 'RJ', 'Jaipur Command', 'Commander Sumer Singh', 'Adv. P. R. Bairwa', 'ACTIVE', 7],
      ['state_pb', 'Punjab', 'पंजाब', 'पंजाब', 'PB', 'Jalandhar Command', 'Sainik Jaswant Singh', 'Harpreet Singh', 'ACTIVE', 8]
    ];

    for (const s of states) {
      await client.query(`
        INSERT INTO states (id, name, hindi_name, marathi_name, code, headquarters, president_name, secretary_name, status, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET name = $2, code = $5, headquarters = $6
      `, s);
    }

    // 5. Seed Primary Super Admin User
    console.log(` Seeding Supreme Command user (admin@ssd.org)...`);
    await client.query(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role_id, department, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET role_id = $6, status = $8
    `, [
      'usr_super_admin',
      'admin@ssd.org',
      superAdminPasswordHash,
      'Commander Rameshwar S. Meshram (Supreme Command)',
      '+91 98223 41927',
      'super_admin',
      'Supreme Command Council',
      'ACTIVE'
    ]);

    // Jurisdiction for super admin (National HQ)
    await client.query(`
      INSERT INTO user_jurisdictions (id, user_id, role_id, is_primary)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `, ['jur_super_admin', 'usr_super_admin', 'super_admin', true]);

    // 6. Optional: Supabase Storage Buckets (if Supabase REST keys provided)
    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
      console.log(` Checking Supabase Storage buckets...`);
      try {
        const sb = createClient(supabaseUrl, supabaseServiceKey);
        const buckets = ['photos', 'documents', 'receipts'];
        for (const bName of buckets) {
          const { data: existing } = await sb.storage.getBucket(bName);
          if (!existing) {
            await sb.storage.createBucket(bName, { public: true });
            console.log(`  ➕ Created public storage bucket: ${bName}`);
          } else {
            console.log(`  ✓ Bucket '${bName}' exists`);
          }
        }
      } catch (sbErr) {
        console.warn(`  ⚠️ Storage bucket check notice: ${sbErr.message}`);
      }
    }

    // Query summary
    const countRes = await client.query(`
      SELECT 
        (SELECT count(*) FROM roles) as roles_count,
        (SELECT count(*) FROM users) as users_count,
        (SELECT count(*) FROM states) as states_count
    `);
    const counts = countRes.rows[0];

    console.log(`\n==========================================================================`);
    console.log(` 🎉 SUPABASE MIGRATION COMPLETED SUCCESSFULLY!`);
    console.log(` -------------------------------------------------------------------------`);
    console.log(` Roles Seeded:    ${counts.roles_count}`);
    console.log(` Users Seeded:    ${counts.users_count}`);
    console.log(` States Seeded:   ${counts.states_count}`);
    console.log(` Admin User:      admin@ssd.org (Password: SSD1927)`);
    console.log(` Database:        Supabase PostgreSQL Cloud`);
    console.log(`==========================================================================\n`);

  } catch (err) {
    console.error(`❌ Migration failed:`, err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSupabaseMigration();
