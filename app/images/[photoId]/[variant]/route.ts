import { ApiError, handleApiError } from "@/lib/http";
import { getBindings } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/request";

const variants = {
  thumbnail: { width: 480, quality: 75, fit: "scale-down" as const },
  display: { width: 1920, quality: 82, fit: "scale-down" as const },
};

export async function GET(request: Request, context: { params: Promise<{ photoId: string; variant: string }> }) {
  try {
    const { photoId, variant } = await context.params;
    const preset = variants[variant as keyof typeof variants];
    if (!preset) throw new ApiError(404, "IMAGE_VARIANT_NOT_FOUND", "找不到此圖片版本。");
    const admin = createAdminClient();
    const { data: photo, error } = await admin.from("photos").select("owner_id,visibility,processing_status,deleted_at,photo_assets(object_key)").eq("id", photoId).maybeSingle();
    if (error) throw error;
    if (!photo || photo.deleted_at || photo.processing_status !== "READY") throw new ApiError(404, "PHOTO_NOT_FOUND", "找不到此照片。");
    if (photo.visibility !== "PUBLIC") {
      const user = await requireProfile(request);
      if (user.profileId !== photo.owner_id) throw new ApiError(403, "PHOTO_FORBIDDEN", "你沒有權限查看這張照片。");
    }
    const asset = Array.isArray(photo.photo_assets) ? photo.photo_assets[0] : photo.photo_assets;
    if (!asset?.object_key) throw new ApiError(404, "PHOTO_ASSET_NOT_FOUND", "找不到照片原始檔。");
    const object = await getBindings().PHOTOS_BUCKET.get(asset.object_key);
    if (!object) throw new ApiError(404, "PHOTO_ASSET_NOT_FOUND", "找不到照片原始檔。");
    const result = await getBindings().IMAGES.input(object.body).transform(preset).output({ format: "image/webp" });
    const response = result.response({ headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
