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
      client = createClient(body.data.supabaseUrl, body.data.supabaseAnonKey, {
        auth: { detectSessionInUrl: false, flowType: "pkce", persistSession: true },
      });
      return client;
    });
  return clientPromise;
}

export async function syncAtlasframeSession(accessToken: string) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? "無法建立 AtlasFrame 登入狀態。");
  }
}
