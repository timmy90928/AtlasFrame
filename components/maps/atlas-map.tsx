"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type Marker = { lat: number; lng: number; displayName: string; photoId: string };
type Props = { markers?: Marker[]; onPick?: (coordinates: { lat: number; lng: number }) => void; className?: string };
const styleUrl = "https://tiles.openfreemap.org/styles/liberty";

export function AtlasMap({ markers = [], onPick, className = "map-frame" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | undefined>(undefined);
  const markerHandles = useRef<Array<{ remove: () => void }>>([]);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    void (async () => {
      if (!container.current) return;
      const maplibregl = (await import("maplibre-gl")).default;
      if (disposed || !container.current) return;
      const map = new maplibregl.Map({ container: container.current, style: styleUrl, center: [121.5654, 25.033], zoom: 3 });
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      if (onPick) map.on("click", (event) => onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng }));
      mapRef.current = map;
      map.on("load", () => setMapReady(true));
    })();
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = undefined; };
  }, [onPick]);
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    let cancelled = false;
    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !mapRef.current) return;
      markerHandles.current.forEach((marker) => marker.remove());
      markerHandles.current = markers.map((marker) => {
        const content = document.createElement("a");
        content.href = `/photos/${encodeURIComponent(marker.photoId)}`;
        content.textContent = marker.displayName;
        return new maplibregl.Marker({ color: "#c8ff70" })
          .setLngLat([marker.lng, marker.lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(content))
          .addTo(mapRef.current!);
      });
    })();
    return () => { cancelled = true; };
  }, [markers, mapReady]);
  return <div className={className} ref={container} aria-label="互動地圖" />;
}
