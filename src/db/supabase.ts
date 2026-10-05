import { createAdminClient, createContextClient } from '@supabase/server/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Returns a typed administrative Supabase client using @supabase/server/core
 * Authorized to execute elevated administrative operations across PostgreSQL and Storage
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedAdminClient) return cachedAdminClient;

  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    return null;
  }

  try {
    // Attempt standard @supabase/server/core client creation
    cachedAdminClient = createAdminClient();
    return cachedAdminClient;
  } catch {
    // Fallback using direct secret key if environment variables require manual passing
    if (supabaseUrl && secretKey) {
      cachedAdminClient = createClient(supabaseUrl, secretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return cachedAdminClient;
    }
    return null;
  }
}

/**
 * Creates a context-scoped Supabase client for a specific user token (respecting RLS)
 */
export function getContextSupabase(userJwt: string): SupabaseClient | null {
  if (!supabaseUrl || !publishableKey) return null;

  return createClient(supabaseUrl, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
