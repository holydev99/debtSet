import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Safety check: If you forgot to set your .env, the app will tell you why
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing! Check your .env files.");
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);