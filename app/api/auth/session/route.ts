import { z } from "zod";
import { atlasframeSessionCookie, userFromAccessToken } from "@/lib/auth/request";
import { ApiError, handleApiError, ok } from "@/lib/http";

const sessionSchema = z.object({ accessToken: z.string().min(20).max(8192) });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => {
      throw new ApiError(401, "AUTH_REQUIRED", "請先登入後再繼續。");
    });
    const { accessToken } = sessionSchema.parse(body);
    await userFromAccessToken(accessToken);
    const headers = new Headers({ "cache-control": "private, no-store" });
    headers.append("set-cookie", atlasframeSessionCookie(accessToken));
    return ok({ session: "active" }, { headers });
  } catch (error) {
    return handleApiError(error);
  }
}
