import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth/request";
import { handleApiError, ok } from "@/lib/http";
import { toSlug, normalizePlaceName } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/server";
import { createPlaceSchema } from "@/lib/validation/place";

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const input = createPlaceSchema.parse(await request.json());
    const id = randomUUID();
    const normalizedName = normalizePlaceName(input.name);
    const { data: suggestions, error: searchError } = await createAdminClient().rpc("search_places", { p_query: normalizedName, p_lat: input.lat, p_lng: input.lng });
    if (searchError) throw searchError;
    const slug = `${toSlug(input.name) || "place"}-${id.slice(0, 8)}`;
    const { data, error } = await createAdminClient().from("places").insert({
      id,
      name: input.name,
      normalized_name: normalizedName,
      slug,
      coordinates: `POINT(${input.lng} ${input.lat})`,
      country_code: input.countryCode,
    }).select("id,name,slug").single();
    if (error) throw error;
    return ok({ place: data, duplicateCandidates: suggestions ?? [] }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
