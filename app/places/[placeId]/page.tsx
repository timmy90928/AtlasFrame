import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { PhotoGallery } from "@/components/photos/photo-gallery";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlacePage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  const admin = createAdminClient();
  const { data: place } = await admin.from("places").select("id,name").eq("id", placeId).maybeSingle();
  if (!place) notFound();
  const { data: locations } = await admin.from("photo_locations").select("photo_id,photos!inner(id,title,visibility,processing_status,deleted_at)").eq("place_id", placeId).eq("is_active", true);
  const photos = (locations ?? []).flatMap((location) => {
    const photo = Array.isArray(location.photos) ? location.photos[0] : location.photos;
    return photo && photo.visibility === "PUBLIC" && photo.processing_status === "READY" && !photo.deleted_at ? [{ id: photo.id, title: photo.title, photo_locations: [{ display_name: place.name }] }] : [];
  });
  return <><SiteHeader /><main className="page"><section className="profile-head"><div><div className="eyebrow">Canonical place</div><h1>{place.name}</h1><p className="muted">同一個地方，不同的人眼中的世界。</p></div></section><PhotoGallery photos={photos} /></main></>;
}
