import { ApiError } from "@/lib/http";
import { createAdminClient, createAuthClient } from "@/lib/supabase/server";

const sessionCookie = "__Host-atlasframe_access";

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

export async function userFromAccessToken(token: string): Promise<AuthenticatedUser> {
  const { data, error } = await createAuthClient().auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "AUTH_INVALID", "登入狀態已失效，請重新登入。");
  const email = data.user.email?.trim().toLowerCase();
  if (!email) throw new ApiError(401, "AUTH_INVALID", "登入帳號缺少 email 資訊。");
  if (!data.user.email_confirmed_at) throw new ApiError(403, "AUTH_EMAIL_UNVERIFIED", "請先在信箱完成 email 驗證，再回來登入 AtlasFrame。");
  return { subject: data.user.id, email, emailVerified: true };
}

export async function findProfileForUser(user: AuthenticatedUser) {
  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin
    .from("profiles").select("id,username").eq("auth_user_id", user.subject).maybeSingle();
  if (currentError) throw currentError;
  if (current) return current;

  const { data: legacy, error: legacyError } = await admin
    .from("profiles").select("id,username").eq("auth_email", user.email).is("auth_user_id", null).limit(2);
  if (legacyError) throw legacyError;
  if (!legacy?.length) return null;
  if (legacy.length > 1) throw new ApiError(409, "PROFILE_EMAIL_CONFLICT", "此 email 對應多個舊帳號，請聯絡管理員。");

  const { data: linked, error: linkError } = await admin
    .from("profiles").update({ auth_user_id: user.subject }).eq("id", legacy[0].id).is("auth_user_id", null).select("id,username").maybeSingle();
  if (linkError) throw linkError;
  return linked;
}

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const token = accessToken(request);
  if (!token) throw new ApiError(401, "AUTH_REQUIRED", "請先登入後再繼續。");
  return userFromAccessToken(token);
}

export async function requireProfile(request: Request): Promise<AuthenticatedProfile> {
  const user = await requireUser(request);
  const profile = await findProfileForUser(user);
  if (!profile) throw new ApiError(404, "PROFILE_NOT_FOUND", "請先完成 AtlasFrame 個人檔案設定。");
  return { ...user, profileId: profile.id, username: profile.username };
}

export function atlasframeSessionCookie(value: string, maxAge = 3600) {
  return `${sessionCookie}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearAtlasframeSessionCookie() {
  return atlasframeSessionCookie("", 0);
}
