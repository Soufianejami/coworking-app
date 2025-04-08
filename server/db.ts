import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Supabase credentials must be set in environment variables");
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Export db as supabase client for compatibility with existing code
export const db = supabase;

// Export pool for compatibility with existing code that uses SQL queries
export const pool = {
  query: async (text: string, params: any[] = []) => {
    const { data, error } = await supabase.from(text).select('*');
    if (error) throw error;
    return { rows: data };
  },
  end: async () => {
    // No-op for Supabase
  }
};