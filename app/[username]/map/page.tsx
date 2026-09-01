import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { PersonalMap } from "@/components/maps/personal-map";

export const dynamic = "force-dynamic";

export default async function MapPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!username.startsWith("@")) notFound();
  return <><SiteHeader /><main className="map-page"><aside className="map-sidebar"><div className="eyebrow">Personal map</div><h1>{username}</h1><p className="muted">每個 marker 都是一個被選中的地方。</p></aside><PersonalMap username={username} /></main></>;
}
