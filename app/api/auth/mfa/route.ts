import { z } from "zod";
import { verifyMfa } from "@/lib/auth/external-api";
import { atlasframeSessionCookie } from "@/lib/auth/request";
import { handleApiError, ok } from "@/lib/http";

const mfaSchema = z.object({ challenge: z.string().min(20).max(512), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  try {
    const input = mfaSchema.parse(await request.json());
    const token = await verifyMfa(input.challenge, input.code);
    return ok({ mfaRequired: false }, { headers: { "set-cookie": atlasframeSessionCookie(token.accessToken, token.expiresInSeconds ?? 300) } });
  } catch (error) {
    return handleApiError(error);
  }
}
