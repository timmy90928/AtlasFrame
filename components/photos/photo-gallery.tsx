import Link from "next/link";

type Photo = { id: string; title: string | null; photo_locations: { display_name: string | null }[] | null };
export function PhotoGallery({ photos }: { photos: Photo[] }) {
  if (!photos.length) return <div className="empty">這張地圖還沒有公開的代表畫面。</div>;
  return <div className="gallery">{photos.map((photo) => <Link className="photo-tile" href={`/photos/${photo.id}`} key={photo.id}><img src={`/images/${photo.id}/thumbnail`} alt={photo.title ?? "AtlasFrame photo"} /><span>{photo.photo_locations?.[0]?.display_name ?? photo.title ?? "Untitled frame"}</span></Link>)}</div>;
}
