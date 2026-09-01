import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { getAuthRuntimeEnv } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

const sessionCookie = "__Host-atlasframe_access";
const jwksRefreshMs = 5 * 60 * 1000;
let localJwks: ReturnType<typeof createLocalJWKSet> | undefined;
let localJwksOrigin: string | undefined;
let localJwksLoadedAt = 0;

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

function invalidAccessTokenError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "ERR_JWT_EXPIRED") return new ApiError(401, "AUTH_TOKEN_EXPIRED", "登入憑證已過期，請重新登入。");
  if (code === "ERR_JWS_INVALID") return new ApiError(401, "AUTH_TOKEN_SIGNATURE_INVALID", "登入憑證的簽章無法驗證，請重新登入。");
  if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") return new ApiError(401, "AUTH_TOKEN_CLAIMS_INVALID", "登入憑證不適用於 AtlasFrame，請重新登入。");
  if (code === "ERR_JWKS_NO_MATCHING_KEY" || code === "ERR_JWKS_INVALID") return new ApiError(503, "AUTH_JWKS_UNAVAILABLE", "帳號服務的驗證金鑰暫時無法使用，請稍後再試。");
  return new ApiError(401, "AUTH_INVALID", "登入狀態已失效，請重新登入。");
}

async function getAuthJwks(origin: string): Promise<ReturnType<typeof createLocalJWKSet>> {
  if (localJwks && localJwksOrigin === origin && Date.now() - localJwksLoadedAt < jwksRefreshMs) return localJwks;
  const response = await fetch(new URL("/api/auth/jwks.json", origin), {
    headers: { accept: "application/json, application/jwk-set+json" },
  });
  if (!response.ok) throw new ApiError(503, "AUTH_JWKS_UNAVAILABLE", "帳號服務的驗證金鑰暫時無法使用，請稍後再試。");
  const jwks = await response.json() as JSONWebKeySet;
  localJwks = createLocalJWKSet(jwks);
  localJwksOrigin = origin;
  localJwksLoadedAt = Date.now();
  return localJwks;
}

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const token = accessToken(request);
  if (!token) throw new ApiError(401, "AUTH_REQUIRED", "請先登入後再繼續。");
  const runtime = getAuthRuntimeEnv();
  try {
    const jwks = await getAuthJwks(runtime.AUTH_API_ORIGIN);
    const { payload } = await jwtVerify(token, jwks, { audience: runtime.AUTH_CLIENT_ID, algorithms: ["ES256"] });
    const subject = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!subject || !email) throw new ApiError(401, "AUTH_INVALID", "登入憑證缺少必要身分資訊，請重新登入。");
    if (payload.email_verified !== true) throw new ApiError(403, "AUTH_EMAIL_UNVERIFIED", "請先在帳號服務完成 email 驗證，再回來登入 AtlasFrame。");
    return { subject: authSubject(runtime.AUTH_API_ORIGIN, subject), email, emailVerified: true };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.warn("AtlasFrame access token validation failed", { name: error instanceof Error ? error.name : "UnknownError" });
    throw invalidAccessTokenError(error);
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
