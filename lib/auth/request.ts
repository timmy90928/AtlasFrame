import { createRemoteJWKSet, jwtVerify } from "jose";
import { getAuthRuntimeEnv } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

const sessionCookie = "__Host-atlasframe_access";
let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let remoteJwksOrigin: string | undefined;

export type AuthenticatedUser = {
  subject: string;
  email: string;
  emailVerified: boolean;
};

export type AuthenticatedProfile = AuthenticatedUser & {
  profileId: string;
  username: string;
};

function readCookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function accessToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? readCookie(request, sessionCookie);
}

function authSubject(origin: string, subject: string) {
  return `${new URL(origin).host}:${subject}`;
}

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const token = accessToken(request);
  if (!token) throw new ApiError(401, "AUTH_REQUIRED", "請先登入後再繼續。");
  const runtime = getAuthRuntimeEnv();
  if (!remoteJwks || remoteJwksOrigin !== runtime.AUTH_API_ORIGIN) {
    remoteJwksOrigin = runtime.AUTH_API_ORIGIN;
    remoteJwks = createRemoteJWKSet(new URL("/api/auth/jwks.json", runtime.AUTH_API_ORIGIN));
  }
  try {
    const { payload } = await jwtVerify(token, remoteJwks, { audience: runtime.AUTH_CLIENT_ID, algorithms: ["ES256"] });
    const subject = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!subject || !email || payload.email_verified !== true) throw new Error("missing required identity claims");
    return { subject: authSubject(runtime.AUTH_API_ORIGIN, subject), email, emailVerified: true };
  } catch {
    throw new ApiError(401, "AUTH_INVALID", "登入狀態已失效，請重新登入。");
  }
}

export async function requireProfile(request: Request): Promise<AuthenticatedProfile> {
  const user = await requireUser(request);
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("id,username")
    .eq("auth_subject", user.subject)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "PROFILE_NOT_FOUND", "請先完成 AtlasFrame 個人檔案設定。");
  return { ...user, profileId: data.id, username: data.username };
}

export function atlasframeSessionCookie(value: string, maxAge = 300) {
  return `${sessionCookie}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearAtlasframeSessionCookie() {
  return atlasframeSessionCookie("", 0);
}
