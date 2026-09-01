import { z } from "zod";
import { handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";

const querySchema = z.object({
  q: z.string().trim().min(1).max(160),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = querySchema.parse(Object.fromEntries(url.searchParams));
    const { data, error } = await createAdminClient().rpc("search_places", { p_query: input.q.toLocaleLowerCase("en-US"), p_lat: input.lat, p_lng: input.lng });
    if (error) throw error;
    return ok({ places: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}
