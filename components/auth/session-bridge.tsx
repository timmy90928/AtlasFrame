"use client";

import { useEffect } from "react";
import { createBrowserSupabaseClient, syncAtlasframeSession } from "@/lib/supabase/browser";

export function SessionBridge() {
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void createBrowserSupabaseClient().then(async (supabase) => {
      const sync = async (accessToken?: string) => {
        if (accessToken && active) await syncAtlasframeSession(accessToken).catch(() => undefined);
      };
      const { data } = await supabase.auth.getSession();
      await sync(data.session?.access_token);
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void sync(session?.access_token); });
      unsubscribe = () => listener.subscription.unsubscribe();
    }).catch(() => undefined);
    return () => { active = false; unsubscribe?.(); };
  }, []);
  return null;
}
