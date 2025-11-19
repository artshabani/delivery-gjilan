import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with service role key for admin operations
 * Use this for server-side API routes that need elevated permissions
 */
export const adminSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

