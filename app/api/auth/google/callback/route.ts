import { redeemGoogleCode } from "@/lib/auth/external-api";
import { atlasframeSessionCookie } from "@/lib/auth/request";
import { getAuthRuntimeEnv } from "@/lib/env";

const cookieName = "__Host-atlasframe_oauth";

function cookie(request: Request): { state: string; verifier: string } | null {
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as { state?: string; verifier?: string };
    return typeof parsed.state === "string" && typeof parsed.verifier === "string" ? { state: parsed.state, verifier: parsed.verifier } : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const runtime = getAuthRuntimeEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const pending = cookie(request);
  if (!code || !state || !pending || state !== pending.state) {
    return Response.redirect(new URL("/login?error=google_state", runtime.APP_ORIGIN), 302);
  }
  try {
    const token = await redeemGoogleCode(code!, pending.verifier);
    const headers = new Headers({ location: new URL("/auth/callback", runtime.APP_ORIGIN).toString() });
    headers.append("set-cookie", atlasframeSessionCookie(token.accessToken, token.expiresInSeconds ?? 300));
    headers.append("set-cookie", `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    return new Response(null, { status: 302, headers });
  } catch {
    return Response.redirect(new URL("/login?error=google_failed", runtime.APP_ORIGIN), 302);
  }
}
