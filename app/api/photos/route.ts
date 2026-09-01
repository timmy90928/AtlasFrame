import { requireProfile } from "@/lib/auth/request";
import { handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await requireProfile(request);
    const { data, error } = await createAdminClient().from("photos").select("id,title,visibility,processing_status,created_at,photo_locations(place_id,display_name)").eq("owner_id", user.profileId).is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw error;
    return ok({ photos: data });
  } catch (error) {
    return handleApiError(error);
  }
}
