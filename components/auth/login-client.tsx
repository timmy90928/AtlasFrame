"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient, syncAtlasframeSession } from "@/lib/supabase/browser";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(undefined); setNotice(undefined);
    try {
      const supabase = await createBrowserSupabaseClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.session) throw new Error(signInError?.message ?? "無法完成登入。");
      await syncAtlasframeSession(data.session.access_token);
      window.location.assign("/auth/callback");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "無法完成登入。"); }
    finally { setLoading(false); }
  }

  async function signInWithGoogle() {
    setLoading(true); setError(undefined); setNotice(undefined);
    try {
      const supabase = await createBrowserSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw new Error(oauthError.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "無法啟動 Google 登入。"); setLoading(false); }
  }

  async function requestPasswordReset() {
    if (!email) { setError("請先輸入 Email。 "); return; }
    setLoading(true); setError(undefined); setNotice(undefined);
    try {
      const supabase = await createBrowserSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw new Error(resetError.message);
      setNotice("若此 Email 已受邀，我們已寄出重設密碼連結。 ");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "無法寄出重設密碼信。"); }
    finally { setLoading(false); }
  }

  return <div className="form-stack"><button className="button" disabled={loading} onClick={() => void signInWithGoogle()}>{loading ? "登入中…" : "以 Google 帳號登入"}</button><div className="auth-divider"><span>或使用帳號密碼</span></div><form className="form-stack" onSubmit={signIn}><label className="field">Email<input autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="field">密碼<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="button ghost" disabled={loading}>{loading ? "登入中…" : "以帳號密碼登入"}</button></form><button className="link-button" type="button" disabled={loading} onClick={() => void requestPasswordReset()}>忘記密碼？</button><p className="muted">AtlasFrame Alpha 目前僅開放受邀帳號。登入後會確認 email 是否在 allowlist 中。</p>{notice && <p className="status" role="status">{notice}</p>}{error && <p className="status error" role="alert">{error}</p>}</div>;
}
