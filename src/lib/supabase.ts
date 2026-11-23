import { createClient, type User } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;
function readRuntimeConfig(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

const runtimeUrl = readRuntimeConfig('sukhan_supabase_url');
const runtimeKey = readRuntimeConfig('sukhan_supabase_publishable_key');

export const SUPABASE_URL = (env.VITE_SUPABASE_URL || runtimeUrl || '').trim();
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || runtimeKey || '').trim();
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export type { User as SupabaseUser };
