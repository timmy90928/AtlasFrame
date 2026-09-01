import { ApiError } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

export async function assertAllowlisted(email: string) {
  const { data, error } = await createAdminClient()
    .from("alpha_allowlist")
    .select("email")
    .eq("email", email.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) throw new ApiError(403, "ALPHA_ALLOWLIST_REQUIRED", "此帳號尚未在 Alpha 受邀名單中。");
}
