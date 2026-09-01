import { z } from "zod";
import { verifyMfa } from "@/lib/auth/external-api";
import { atlasframeSessionCookie } from "@/lib/auth/request";
import { handleApiError } from "@/lib/http";

const mfaSchema = z.object({ challenge: z.string().min(20).max(512), code: z.string().regex(/^\d{6}$/) });

function sessionResponse(accessToken: string, maxAge: number) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("set-cookie", atlasframeSessionCookie(accessToken, maxAge));
  return new Response(JSON.stringify({ data: { mfaRequired: false } }), { headers });
}

export async function POST(request: Request) {
  try {
    const input = mfaSchema.parse(await request.json());
    const token = await verifyMfa(input.challenge, input.code);
    return sessionResponse(token.accessToken, token.expiresInSeconds ?? 300);
  } catch (error) {
    return handleApiError(error);
  }
}
