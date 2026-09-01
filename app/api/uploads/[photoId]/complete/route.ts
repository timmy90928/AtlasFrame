import { requireProfile } from "@/lib/auth/request";
import { getBindings } from "@/lib/env";
import { ApiError, fromSupabaseError, handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";
import { completeUploadSchema } from "@/lib/validation/photo";

export async function POST(request: Request, context: { params: Promise<{ photoId: string }> }) {
  try {
    const user = await requireProfile(request);
    const { photoId } = await context.params;
    const input = completeUploadSchema.parse(await request.json());
    const admin = createAdminClient();
    const { data: asset, error: assetError } = await admin.from("photo_assets").select("object_key,file_size").eq("photo_id", photoId).maybeSingle();
    if (assetError) throw assetError;
    if (!asset) throw new ApiError(404, "PHOTO_NOT_FOUND", "找不到等待完成的照片。");
    const object = await getBindings().PHOTOS_BUCKET.head(asset.object_key);
    if (!object || object.size !== Number(asset.file_size)) throw new ApiError(400, "INVALID_IMAGE", "上傳檔案不存在或檔案大小不符。");
    const { error } = await admin.rpc("complete_photo_upload", { p_user_id: user.profileId, p_photo_id: photoId, p_metadata: input.metadata });
    if (error) fromSupabaseError(error);
    return ok({ photoId, status: "READY" });
  } catch (error) {
    return handleApiError(error);
  }
}
