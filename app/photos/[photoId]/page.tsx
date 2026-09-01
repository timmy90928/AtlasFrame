import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PhotoPage({ params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  const { data: photo } = await createAdminClient().from("photos").select("id,title,description,captured_at,visibility,profiles!photos_owner_id_fkey(username,display_name),photo_locations(display_name,precision),photo_metadata(camera_make,camera_model,lens_model,focal_length,aperture,shutter_seconds,iso)").eq("id", photoId).eq("visibility", "PUBLIC").eq("processing_status", "READY").is("deleted_at", null).maybeSingle();
  if (!photo) notFound();
  const owner = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles;
  const location = Array.isArray(photo.photo_locations) ? photo.photo_locations[0] : photo.photo_locations;
  const metadata = Array.isArray(photo.photo_metadata) ? photo.photo_metadata[0] : photo.photo_metadata;
  return <><SiteHeader /><main className="page detail"><div className="detail-image"><img src={`/images/${photo.id}/display`} alt={photo.title ?? "AtlasFrame photo"} /></div><aside className="detail-side"><div className="eyebrow">Representative frame</div><h1>{photo.title ?? location?.display_name ?? "Untitled frame"}</h1><p className="muted">by {owner?.display_name ?? `@${owner?.username ?? "unknown"}`}</p>{photo.description && <p className="muted">{photo.description}</p>}<div className="kv"><div><span>Place</span><strong>{location?.display_name ?? "Unassigned"}</strong></div><div><span>Visibility</span><strong>{photo.visibility}</strong></div><div><span>Camera</span><strong>{metadata?.camera_model ?? "Not recorded"}</strong></div><div><span>Lens</span><strong>{metadata?.lens_model ?? "Not recorded"}</strong></div></div></aside></main></>;
}
