import { LoginClient } from "@/components/auth/login-client";
import { SiteHeader } from "@/components/layout/site-header";

export default function LoginPage() {
  return <><SiteHeader /><main className="auth-shell"><section className="auth-card"><div className="eyebrow">Alpha access</div><h1>讓你的照片回到地圖。</h1><p className="muted">登入後建立一個公開的 AtlasFrame profile。你上傳的照片和精確位置預設公開顯示。</p><LoginClient /></section></main></>;
}
