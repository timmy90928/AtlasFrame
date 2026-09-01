import { getAuthRuntimeEnv, getAuthService } from "@/lib/env";
import { ApiError } from "@/lib/http";

type ExternalError = { error?: string };
export type TokenResult = { accessToken: string; expiresInSeconds?: number };
export type MfaResult = { mfaRequired: true; challenge: string } | { mfaRequired: false; token: TokenResult };

async function externalJson<T>(path: string, body: Record<string, string>) {
  const runtime = getAuthRuntimeEnv();
  const response = await getAuthService().fetch(new Request(new URL(path, runtime.AUTH_API_ORIGIN), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  }));
  const data = await response.json().catch(() => ({})) as T & ExternalError;
  return { response, data };
}

export async function passwordLogin(identifier: string, password: string): Promise<MfaResult> {
  const { response, data } = await externalJson<{ accessToken?: string; expiresInSeconds?: number; mfaRequired?: boolean; challenge?: string }>("/api/users/login", { identifier, password });
  if (response.status === 202 && data.mfaRequired && data.challenge) return { mfaRequired: true, challenge: data.challenge };
  if (!response.ok || !data.accessToken) throw new ApiError(response.status === 401 ? 401 : 502, "AUTH_LOGIN_FAILED", data.error ?? "無法完成登入。");
  return { mfaRequired: false, token: { accessToken: data.accessToken, expiresInSeconds: data.expiresInSeconds } };
}

export async function verifyMfa(challenge: string, code: string): Promise<TokenResult> {
  const { response, data } = await externalJson<{ accessToken?: string; expiresInSeconds?: number }>("/api/account/mfa/verify", { challenge, code });
  if (!response.ok || !data.accessToken) throw new ApiError(response.status === 401 ? 401 : 502, "AUTH_MFA_FAILED", data.error ?? "驗證碼無效或已過期。");
  return { accessToken: data.accessToken, expiresInSeconds: data.expiresInSeconds };
}

export async function redeemGoogleCode(code: string, verifier: string): Promise<TokenResult> {
  const runtime = getAuthRuntimeEnv();
  const { response, data } = await externalJson<{ accessToken?: string; expiresInSeconds?: number }>("/api/auth/handoff/exchange", { client_id: runtime.AUTH_CLIENT_ID, code, code_verifier: verifier });
  if (!response.ok || !data.accessToken) throw new ApiError(401, "AUTH_GOOGLE_FAILED", data.error ?? "Google 登入已失效，請重新嘗試。");
  return { accessToken: data.accessToken, expiresInSeconds: data.expiresInSeconds };
}
