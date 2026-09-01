import { requireProfile } from "@/lib/auth/request";
import { ApiError, handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request, context: { params: Promise<{ photoId: string }> }) {
  try {
    const { photoId } = await context.params;
    const admin = createAdminClient();
    const { data: photo, error } = await admin.from("photos").select("id,owner_id,title,description,visibility,captured_at,processing_status,created_at,profiles!photos_owner_id_fkey(username,display_name),photo_locations(place_id,display_name,precision,is_active)").eq("id", photoId).is("deleted_at", null).maybeSingle();
    if (error) throw error;
    if (!photo) throw new ApiError(404, "PHOTO_NOT_FOUND", "找不到此照片。");
    if (photo.visibility !== "PUBLIC") {
      const user = await requireProfile(request);
      if (user.profileId !== photo.owner_id) throw new ApiError(403, "PHOTO_FORBIDDEN", "你沒有權限查看這張照片。");
    }
    return ok({ photo });
  } catch (error) {
    return handleApiError(error);
  }
}
