import { z } from "zod";
import { handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

const mapQuerySchema = z.object({
  username: z.string().regex(/^@[a-z0-9][a-z0-9_-]{2,31}$/).transform((value) => value.slice(1)),
  minLat: z.coerce.number().min(-90).max(90), minLng: z.coerce.number().min(-180).max(180),
  maxLat: z.coerce.number().min(-90).max(90), maxLng: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().min(0).max(22),
});

export async function GET(request: Request) {
  try {
    const input = mapQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const { data, error } = await createAdminClient().rpc("map_photos_in_bbox", {
      p_username: input.username, p_min_lat: input.minLat, p_min_lng: input.minLng, p_max_lat: input.maxLat, p_max_lng: input.maxLng,
    });
    if (error) throw error;
    return ok({ photos: data ?? [], zoom: input.zoom });
  } catch (error) {
    return handleApiError(error);
  }
}
