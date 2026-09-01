import { randomUUID } from "crypto";
import { z } from "zod";
import { assertAllowlisted } from "@/lib/auth/allowlist";
import { requireUser } from "@/lib/auth/request";
import { ApiError, handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,31}$/),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { data, error } = await createAdminClient().from("profiles").select("*").eq("auth_subject", user.subject).maybeSingle();
    if (error) throw error;
    return ok({ profile: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await assertAllowlisted(user.email);
    const input = profileSchema.parse(await request.json());
    const admin = createAdminClient();
    const { data: existing } = await admin.from("profiles").select("id").eq("auth_subject", user.subject).maybeSingle();
    if (existing) throw new ApiError(409, "PROFILE_ALREADY_EXISTS", "此帳號已建立個人檔案。");
    const { data, error } = await admin.from("profiles").insert({ id: randomUUID(), auth_subject: user.subject, auth_email: user.email, username: input.username, display_name: input.displayName ?? null }).select("*").single();
    if (error?.code === "23505") throw new ApiError(409, "USERNAME_TAKEN", "此使用者名稱已被使用。");
    if (error) throw error;
    return ok({ profile: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
