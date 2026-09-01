import { z } from "zod";
import { passwordLogin } from "@/lib/auth/external-api";
import { atlasframeSessionCookie } from "@/lib/auth/request";
import { handleApiError, ok } from "@/lib/http";

const loginSchema = z.object({ identifier: z.string().trim().min(1).max(320), password: z.string().min(1).max(1024) });

function sessionResponse(accessToken: string, maxAge: number) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("set-cookie", atlasframeSessionCookie(accessToken, maxAge));
  return new Response(JSON.stringify({ data: { mfaRequired: false } }), { headers });
}

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const result = await passwordLogin(input.identifier, input.password);
    if (result.mfaRequired) return ok({ mfaRequired: true, challenge: result.challenge });
    return sessionResponse(result.token.accessToken, result.token.expiresInSeconds ?? 300);
  } catch (error) {
    return handleApiError(error);
  }
}
