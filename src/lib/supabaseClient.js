import { createClient } from '@supabase/supabase-js';

// Credentials must come from the environment (.env / .env.local).
// Never hard-code project credentials here: they would ship to every
// deployment and point every user's data at the wrong project.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey
);

// Safe placeholder so the client can be created even when unconfigured;
// all network paths are gated behind `isSupabaseConfigured` checks.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
