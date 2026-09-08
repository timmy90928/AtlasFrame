"use client";

import { FormEvent, useEffect, useState } from "react";
import { createBrowserSupabaseClient, syncAtlasframeSession } from "@/lib/supabase/browser";

type Step = "loading" | "create" | "error";
type ProfileResponse = { data?: { profile?: unknown }; error?: { message?: string } };

export function CallbackClient() {
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState("正在完成安全登入…");
  const [username, setUsername] = useState("");
  useEffect(() => { void finish(); }, []);

  async function finish() {
    try {
      const supabase = await createBrowserSupabaseClient();
      const code = new URL(window.location.href).searchParams.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) throw new Error(error?.message ?? "Google 登入驗證失敗。");
        await syncAtlasframeSession(data.session.access_token);
        window.history.replaceState({}, "", "/auth/callback");
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) await syncAtlasframeSession(data.session.access_token);
      }
      await loadProfile();
    } catch (cause) {
      setStep("error"); setMessage(cause instanceof Error ? cause.message : "登入狀態已失效，請重新登入。");
    }
  }

  async function loadProfile() {
    const response = await fetch("/api/profile");
    const body = await response.json() as ProfileResponse;
    if (response.ok) {
      if (body.data?.profile) { window.location.assign("/upload"); return; }
      setStep("create"); setMessage("選一個用於個人地圖網址的使用者名稱。"); return;
    }
    if (response.status === 403) { setStep("error"); setMessage(body.error?.message ?? "此帳號尚未受邀。"); return; }
    setStep("error"); setMessage(body.error?.message ?? "登入狀態已失效，請重新登入。");
  }

  async function createProfile(event: FormEvent) {
    event.preventDefault(); setStep("loading"); setMessage("正在建立你的 AtlasFrame…");
    const response = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username }) });
    const body = await response.json() as ProfileResponse;
    if (!response.ok) { setStep("create"); setMessage(body.error?.message ?? "無法建立個人檔案。"); return; }
    window.location.assign("/upload");
  }

  if (step === "create") return <form className="form-stack" onSubmit={createProfile}><p className="status">{message}</p><label className="field">使用者名稱 <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9_-]{2,31}" minLength={3} maxLength={32} required placeholder="your-name" /></label><button className="button">建立個人地圖</button></form>;
  if (step === "error") return <div className="form-stack"><p className="status error" role="status">{message}</p><a className="button" href="/login">重新登入</a></div>;
  return <p className="status" role="status">{message}</p>;
}
