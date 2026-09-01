import { describe, expect, it } from "vitest";
import { createUploadSchema, detectSupportedImageContentType, photoMetadataSchema } from "@/lib/validation/photo";
import { createPlaceSchema, setLocationSchema } from "@/lib/validation/place";
import { normalizePlaceName, toSlug } from "@/lib/slug";

describe("upload validation", () => {
  it("accepts supported images below the hard upload limit", () => {
    expect(createUploadSchema.parse({ filename: "frame.jpg", contentType: "image/jpeg", size: 1024 })).toMatchObject({ contentType: "image/jpeg" });
  });

  it("rejects unsupported formats and files over 25 MB", () => {
    expect(() => createUploadSchema.parse({ filename: "raw.nef", contentType: "image/nef", size: 1 })).toThrow();
    expect(() => createUploadSchema.parse({ filename: "huge.jpg", contentType: "image/jpeg", size: 25 * 1024 * 1024 + 1 })).toThrow();
  });

  it("detects supported image formats from file signatures", () => {
    expect(detectSupportedImageContentType(Uint8Array.from([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
    expect(detectSupportedImageContentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectSupportedImageContentType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    expect(detectSupportedImageContentType(Uint8Array.from([0, 1, 2]))).toBeNull();
  });

  it("keeps EXIF values independently valid from platform location", () => {
    const metadata = photoMetadataSchema.parse({ originalLatitude: 25.033, originalLongitude: 121.565, cameraModel: "X100V" });
    const location = setLocationSchema.parse({ placeId: "9a0f22d2-7c52-48d4-bc4a-5a37622401de", replaceExisting: true });
    expect(metadata.originalLatitude).toBe(25.033);
    expect(location.replaceExisting).toBe(true);
  });
});

describe("place validation", () => {
  it("normalizes place names without converting their public label", () => {
    expect(normalizePlaceName("  Taipei   101 ")).toBe("taipei 101");
    expect(toSlug("Kraków Main Square")).toBe("krakow-main-square");
    expect(createPlaceSchema.parse({ name: "Taipei 101", lat: 25.033, lng: 121.565 }).name).toBe("Taipei 101");
  });
});
