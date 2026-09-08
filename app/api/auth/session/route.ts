import { z } from "zod";
import { atlasframeSessionCookie, userFromAccessToken } from "@/lib/auth/request";
import { handleApiError, ok } from "@/lib/http";

const sessionSchema = z.object({ accessToken: z.string().min(20).max(8192) });

export async function POST(request: Request) {
  try {
    const { accessToken } = sessionSchema.parse(await request.json());
    await userFromAccessToken(accessToken);
    const headers = new Headers({ "cache-control": "private, no-store" });
    headers.append("set-cookie", atlasframeSessionCookie(accessToken));
    return ok({ session: "active" }, { headers });
  } catch (error) {
    return handleApiError(error);
  }
}
