"use client";

import { FormEvent, useEffect, useState } from "react";
import { createBrowserSupabaseClient, syncAtlasframeSession } from "@/lib/supabase/browser";

export function ResetPasswordClient() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("正在驗證重設密碼連結…");

  useEffect(() => { void establishRecoverySession(); }, []);
  async function establishRecoverySession() {
    try {
      const supabase = await createBrowserSupabaseClient();
      const code = new URL(window.location.href).searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.history.replaceState({}, "", "/auth/reset-password");
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("重設連結已失效，請重新申請。");
      setReady(true); setMessage("請設定新的密碼。");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "重設連結無法使用。"); }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setMessage("兩次輸入的密碼不一致。 "); return; }
    try {
      const supabase = await createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error || !data.user) throw new Error(error?.message ?? "無法更新密碼。");
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) await syncAtlasframeSession(sessionData.session.access_token);
      window.location.assign("/auth/callback");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "無法更新密碼。"); }
  }

  if (!ready) return <p className="status" role="status">{message}</p>;
  return <form className="form-stack" onSubmit={updatePassword}><p className="status">{message}</p><label className="field">新密碼<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label className="field">確認新密碼<input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label><button className="button">更新密碼</button></form>;
}
