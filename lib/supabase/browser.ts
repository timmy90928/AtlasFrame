import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;
let clientPromise: Promise<ReturnType<typeof createClient>> | undefined;

export async function createBrowserSupabaseClient() {
  if (client) return client;
  clientPromise ??= fetch("/api/config")
    .then(async (response) => {
      const body = await response.json() as { data?: { supabaseUrl?: string; supabaseAnonKey?: string }; error?: { message?: string } };
      if (!response.ok || !body.data?.supabaseUrl || !body.data.supabaseAnonKey) {
        throw new Error(body.error?.message ?? "Supabase 尚未完成設定。");
      }
      client = createClient(body.data.supabaseUrl, body.data.supabaseAnonKey);
      return client;
    });
  return clientPromise;
}
