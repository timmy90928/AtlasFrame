"use client";

import { FormEvent, useState } from "react";

type LoginResponse = { data?: { mfaRequired?: boolean; challenge?: string }; error?: { message?: string } };

async function post(path: string, body: Record<string, string>) {
  const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as LoginResponse;
  if (!response.ok) throw new Error(payload.error?.message ?? "登入失敗。 ");
  return payload.data ?? {};
}

export function LoginClient() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<string>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(undefined);
    try {
      const result = await post("/api/auth/login", { identifier, password });
      if (result.mfaRequired && result.challenge) { setChallenge(result.challenge); return; }
      window.location.assign("/auth/callback");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "無法完成登入。"); }
    finally { setLoading(false); }
  }

  async function completeMfa(event: FormEvent) {
    event.preventDefault(); if (!challenge) return; setLoading(true); setError(undefined);
    try { await post("/api/auth/mfa", { challenge, code }); window.location.assign("/auth/callback"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "驗證失敗。"); }
    finally { setLoading(false); }
  }

  if (challenge) return <form className="form-stack" onSubmit={completeMfa}><p className="muted">請輸入驗證器 App 的六位數代碼。</p><label className="field">MFA 驗證碼<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label><button className="button" disabled={loading}>{loading ? "驗證中…" : "完成登入"}</button>{error && <p className="status error" role="alert">{error}</p>}</form>;
  return <div className="form-stack"><a className="button" href="/api/auth/google">以 Google 帳號登入</a><div className="auth-divider"><span>或使用帳號密碼</span></div><form className="form-stack" onSubmit={signIn}><label className="field">Email 或使用者名稱<input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label><label className="field">密碼<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="button ghost" disabled={loading}>{loading ? "登入中…" : "以帳號密碼登入"}</button></form><p className="muted">AtlasFrame Alpha 目前僅開放受邀帳號。登入後會確認 email 是否在 allowlist 中。</p>{error && <p className="status error" role="alert">{error}</p>}</div>;
}
