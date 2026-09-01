"use client";

import { ChangeEvent, useCallback, useState } from "react";
import * as exifr from "exifr";
import { AtlasMap } from "@/components/maps/atlas-map";

type Exif = Record<string, unknown>;
type Candidate = { id: string; name: string; latitude: number; longitude: number; distance_meters: number };
type ApiResponse<T> = { data?: T; error?: { message?: string; code?: string; details?: { existingPhotoId?: string } } };
type UploadResponse = { photoId: string; uploadUrl: string; expiresAt: string; requiredHeaders: Record<string, string> };
type SearchResponse = { places: Candidate[] };
type CreatePlaceResponse = { place: { id: string } };

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), ...(init.body ? { "content-type": "application/json" } : {}) } });
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok) throw Object.assign(new Error(body.error?.message ?? "請求失敗。"), { code: body.error?.code, details: body.error?.details });
  if (!body.data) throw new Error("伺服器沒有回傳預期資料。");
  return body.data;
}

function extractMetadata(raw: Exif) {
  const lat = typeof raw.latitude === "number" ? raw.latitude : null;
  const lng = typeof raw.longitude === "number" ? raw.longitude : null;
  const date = raw.DateTimeOriginal instanceof Date ? raw.DateTimeOriginal.toISOString() : null;
  return { cameraMake: raw.Make ?? null, cameraModel: raw.Model ?? null, lensModel: raw.LensModel ?? null, focalLength: raw.FocalLength ?? null, aperture: raw.FNumber ?? null, shutterSeconds: raw.ExposureTime ?? null, iso: raw.ISO ?? null, originalCapturedAt: date, originalLatitude: lat, originalLongitude: lng, orientation: raw.Orientation ?? null, width: raw.ExifImageWidth ?? raw.ImageWidth ?? null, height: raw.ExifImageHeight ?? raw.ImageHeight ?? null, rawExif: raw };
}

export function UploadWorkspace() {
  const [file, setFile] = useState<File>(); const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [photoId, setPhotoId] = useState<string>(); const [status, setStatus] = useState("選擇一張 JPEG、PNG 或 WebP 照片開始。"); const [error, setError] = useState<string>();
  const [lat, setLat] = useState(25.033); const [lng, setLng] = useState(121.5654); const [placeName, setPlaceName] = useState(""); const [candidates, setCandidates] = useState<Candidate[]>([]);
  const chooseFile = useCallback(async (nextFile: File) => {
    setError(undefined); setFile(nextFile); setPhotoId(undefined); setStatus("正在讀取照片原始 EXIF…");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) throw new Error("目前只支援 JPEG、PNG、WebP。");
      const raw = await exifr.parse(nextFile, { gps: true, tiff: true, exif: true, translateValues: false }) ?? {};
      const parsed = extractMetadata(raw);
      setMetadata(parsed);
      if (typeof parsed.originalLatitude === "number" && typeof parsed.originalLongitude === "number") { setLat(parsed.originalLatitude); setLng(parsed.originalLongitude); }
      setStatus("EXIF 已保留在瀏覽器中，尚未上傳。確認後可直接傳至私有 R2。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "無法讀取照片資訊。"); setStatus("請選擇另一張照片。"); }
  }, []);
  async function upload() {
    if (!file) return; setError(undefined); setStatus("正在保留儲存空間並建立安全上傳網址…");
    try {
      const created = await api<UploadResponse>("/api/uploads/create", { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) });
      setStatus("正在直接上傳至私有 R2…");
      const uploaded = await fetch(created.uploadUrl, { method: "PUT", headers: created.requiredHeaders, body: file });
      if (!uploaded.ok) throw new Error("R2 拒絕上傳；請確認 bucket CORS 與 signed URL 設定。");
      setStatus("正在寫入不可編輯的 Original Metadata…");
      await api(`/api/uploads/${created.photoId}/complete`, { method: "POST", body: JSON.stringify({ metadata }) });
      setPhotoId(created.photoId); setStatus("照片已完成。現在選擇或建立代表它的 Place。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "照片上傳失敗。"); }
  }
  async function searchPlace() {
    if (!placeName.trim()) return; setError(undefined);
    try { const data = await api<SearchResponse>(`/api/places/search?q=${encodeURIComponent(placeName)}&lat=${lat}&lng=${lng}`); setCandidates(data.places); setStatus(data.places.length ? "找到可能重複的 Canonical Place。" : "沒有相近 Place，可建立新的地點。"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "無法搜尋地點。"); }
  }
  async function assignPlace(placeId?: string, replaceExisting = false) {
    if (!photoId) return;
    try {
      let resolvedPlaceId = placeId;
      if (!resolvedPlaceId) { const created = await api<CreatePlaceResponse>("/api/places", { method: "POST", body: JSON.stringify({ name: placeName, lat, lng }) }); resolvedPlaceId = created.place.id; }
      await api(`/api/photos/${photoId}/location`, { method: "PATCH", body: JSON.stringify({ placeId: resolvedPlaceId, replaceExisting }) });
      setStatus("Place 已儲存。這張照片現在公開顯示於你的個人地圖。 "); setCandidates([]);
    } catch (cause) {
      const conflict = cause as Error & { code?: string; details?: { existingPhotoId?: string } };
      if (conflict.code === "PLACE_PHOTO_ALREADY_EXISTS" && confirm("你已在這個 Place 有代表照片。要解除舊照片的 Place 關聯並以新照片取代嗎？")) await assignPlace(placeId, true);
      else setError(conflict.message);
    }
  }
  return <div className="upload-grid"><section className="panel"><div className="eyebrow">01 / Original photo</div><div className="drop-zone"><label><strong>{file ? file.name : "把一張照片放進地圖"}</strong><span className="muted">{file ? `${Math.round(file.size / 1024 / 1024 * 10) / 10} MB · ${file.type}` : "點擊選擇檔案。影像不會經過 AtlasFrame app server。"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => { const next = event.target.files?.[0]; if (next) void chooseFile(next); }} /></label></div><div className="form-stack"><button className="button" disabled={!file || Boolean(photoId)} onClick={() => void upload()}>{photoId ? "照片已上傳" : "直接上傳至私有 R2"}</button><p className={`status ${error ? "error" : ""}`}>{error ?? status}</p></div></section><section className="panel"><div className="eyebrow">02 / Canonical place</div><p className="muted">EXIF GPS 只提供建議。拖曳或點擊地圖、選擇既有地點，或手動建立 Place 都不會覆寫原始 GPS。</p><div className="location-grid"><div className="form-stack"><label className="field">Place 名稱<input value={placeName} onChange={(event) => setPlaceName(event.target.value)} placeholder="例如：Taipei 101" /></label><label className="field">緯度<input type="number" value={lat} onChange={(event) => setLat(Number(event.target.value))} /></label><label className="field">經度<input type="number" value={lng} onChange={(event) => setLng(Number(event.target.value))} /></label><button className="button ghost" disabled={!photoId || !placeName} onClick={() => void searchPlace()}>搜尋相近 Place</button><button className="button" disabled={!photoId || !placeName} onClick={() => void assignPlace()}>建立並指定 Place</button>{candidates.length > 0 && <ul className="suggestions">{candidates.map((candidate) => <li key={candidate.id}><button onClick={() => void assignPlace(candidate.id)}><span>{candidate.name}</span><small>{Math.round(candidate.distance_meters)}m</small></button></li>)}</ul>}</div><AtlasMap onPick={({ lat: pickedLat, lng: pickedLng }) => { setLat(pickedLat); setLng(pickedLng); }} /></div></section></div>;
}
