import { getPublicRuntimeEnv } from "@/lib/env";
import { ApiError, handleApiError, ok } from "@/lib/http";

/** Browser-safe runtime configuration; never exposes service or R2 credentials. */
export function GET() {
  try {
    const runtime = getPublicRuntimeEnv();
    return ok({ supabaseUrl: runtime.SUPABASE_URL, supabaseAnonKey: runtime.SUPABASE_PUBLISHABLE_KEY });
  } catch {
    return handleApiError(new ApiError(503, "SERVICE_NOT_CONFIGURED", "登入服務尚未完成設定。"));
  }
}
