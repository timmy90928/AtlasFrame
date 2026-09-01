import { createClient } from "@supabase/supabase-js";
import { getDatabaseRuntimeEnv } from "@/lib/env";

export function createAdminClient() {
  const runtime = getDatabaseRuntimeEnv();
  return createClient(runtime.SUPABASE_URL, runtime.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAuthClient() {
  const runtime = getDatabaseRuntimeEnv();
  return createClient(runtime.SUPABASE_URL, runtime.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
