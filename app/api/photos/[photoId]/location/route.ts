import { requireProfile } from "@/lib/auth/request";
import { fromSupabaseError, handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";
import { setLocationSchema } from "@/lib/validation/place";

export async function PATCH(request: Request, context: { params: Promise<{ photoId: string }> }) {
  try {
    const user = await requireProfile(request);
    const { photoId } = await context.params;
    const input = setLocationSchema.parse(await request.json());
    const { error } = await createAdminClient().rpc("set_photo_location", { p_user_id: user.profileId, p_photo_id: photoId, p_place_id: input.placeId, p_replace_existing: input.replaceExisting });
    if (error) fromSupabaseError(error);
    return ok({ photoId, placeId: input.placeId });
  } catch (error) {
    return handleApiError(error);
  }
}
