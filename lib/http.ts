import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: Record<string, unknown>) {
    super(message);
  }
}

export function ok(data: unknown, init: ResponseInit = {}) {
  return Response.json({ data }, init);
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "輸入內容不符合格式。", details: { issues: error.issues } } }, { status: 400 });
  const message = error instanceof Error ? error.message : "發生未預期的錯誤。";
  console.error(error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
}

export function fromSupabaseError(error: { message: string; details?: string | null }) {
  const code = error.message.match(/(ALPHA_ALLOWLIST_REQUIRED|PROFILE_NOT_FOUND|STORAGE_QUOTA_EXCEEDED|PLATFORM_STORAGE_LIMIT_REACHED|UPLOAD_RESERVATION_EXPIRED|PLACE_PHOTO_ALREADY_EXISTS|PLACE_NOT_FOUND|PHOTO_NOT_FOUND)/)?.[1];
  if (!code) throw new ApiError(500, "DATABASE_ERROR", "資料庫操作失敗。");
  const status = code === "PLACE_PHOTO_ALREADY_EXISTS" ? 409 : code.includes("NOT_FOUND") ? 404 : code.includes("ALLOWLIST") ? 403 : 409;
  const details = code === "PLACE_PHOTO_ALREADY_EXISTS" && error.details ? { existingPhotoId: error.details } : undefined;
  throw new ApiError(status, code, code === "PLACE_PHOTO_ALREADY_EXISTS" ? "你在這個地點已有一張代表照片。" : "此操作目前無法完成。", details);
}
