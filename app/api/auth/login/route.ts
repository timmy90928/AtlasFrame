import { z } from "zod";
import { passwordLogin } from "@/lib/auth/external-api";
import { atlasframeSessionCookie } from "@/lib/auth/request";
import { handleApiError, ok } from "@/lib/http";

const loginSchema = z.object({ identifier: z.string().trim().min(1).max(320), password: z.string().min(1).max(1024) });

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const result = await passwordLogin(input.identifier, input.password);
    if (result.mfaRequired) return ok({ mfaRequired: true, challenge: result.challenge });
    return ok({ mfaRequired: false }, { headers: { "set-cookie": atlasframeSessionCookie(result.token.accessToken, result.token.expiresInSeconds ?? 300) } });
  } catch (error) {
    return handleApiError(error);
  }
}
