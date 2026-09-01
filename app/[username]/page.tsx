import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { PhotoGallery } from "@/components/photos/photo-gallery";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: routeUsername } = await params;
  if (!routeUsername.startsWith("@")) notFound();
  const username = routeUsername.slice(1);
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,username,display_name").eq("username", username).maybeSingle();
  if (!profile) notFound();
  const { data: photos } = await admin.from("photos").select("id,title,photo_locations(display_name)").eq("owner_id", profile.id).eq("visibility", "PUBLIC").eq("processing_status", "READY").is("deleted_at", null).order("created_at", { ascending: false });
  return <><SiteHeader /><main className="page"><section className="profile-head"><div><div className="eyebrow">Personal atlas</div><h1>{profile.display_name ?? `@${profile.username}`}</h1><p className="muted">@{profile.username}</p></div><div className="profile-stats"><span><strong>{photos?.length ?? 0}</strong>Places</span><span><strong>1</strong>Map</span></div></section><PhotoGallery photos={photos ?? []} /></main></>;
}
