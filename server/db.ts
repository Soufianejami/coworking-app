
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Supabase credentials must be set in environment variables");
}

export const db = supabase;

// Export dummy pool for compatibility
export const pool = {
  query: async () => ({ rows: [] }),
  end: async () => {}
};
