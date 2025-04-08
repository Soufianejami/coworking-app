import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

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