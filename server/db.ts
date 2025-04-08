
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials must be set in environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
export const db = supabase;
