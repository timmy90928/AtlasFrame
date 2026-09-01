"use client";

import { useEffect, useState } from "react";
import { AtlasMap } from "@/components/maps/atlas-map";

type Marker = { photo_id: string; lat: number; lng: number; display_name: string };
type MapResponse = { data?: { photos?: Marker[] }; error?: { message?: string } };
export function PersonalMap({ username }: { username: string }) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`/api/map/photos?username=${encodeURIComponent(username)}&minLat=-85&minLng=-180&maxLat=85&maxLng=180&zoom=2`);
        const body = await response.json() as MapResponse;
        if (!response.ok) throw new Error(body.error?.message ?? "無法載入地圖。");
        setMarkers(body.data?.photos ?? []);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "無法載入地圖。"); }
    })();
  }, [username]);
  if (error) return <p className="status error">{error}</p>;
  return <AtlasMap className="live-map" markers={markers.map((marker) => ({ lat: marker.lat, lng: marker.lng, displayName: marker.display_name, photoId: marker.photo_id }))} />;
}
