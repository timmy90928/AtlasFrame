import { CallbackClient } from "@/components/auth/callback-client";
import { SiteHeader } from "@/components/layout/site-header";

export default function AuthCallbackPage() {
  return <><SiteHeader /><main className="auth-shell"><section className="auth-card"><div className="eyebrow">Welcome to AtlasFrame</div><h1>準備你的地圖。</h1><CallbackClient /></section></main></>;
}
