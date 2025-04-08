
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ezlbrfnyuzrhqcezqsax.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6bGJyZm55dXpyaHFjZXpxc2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNTQwMzcsImV4cCI6MjA1OTYzMDAzN30.9XoUD2_wWpvr5O_vCAxygwwFCGVoGTZObQpaeN14Ni8';

export const supabase = createClient(supabaseUrl, supabaseKey);
