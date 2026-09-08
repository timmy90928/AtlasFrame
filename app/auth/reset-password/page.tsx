import { ResetPasswordClient } from "@/components/auth/reset-password-client";
import { SiteHeader } from "@/components/layout/site-header";

export default function ResetPasswordPage() {
  return <><SiteHeader /><main className="auth-shell"><section className="auth-card"><div className="eyebrow">Password recovery</div><h1>設定新密碼。</h1><ResetPasswordClient /></section></main></>;
}
