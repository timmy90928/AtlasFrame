import { z } from "zod";

export const supportedImageContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type SupportedImageContentType = typeof supportedImageContentTypes[number];

export function detectSupportedImageContentType(bytes: Uint8Array): SupportedImageContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

const finiteNullableNumber = z.number().finite().nullable().optional();

export const photoMetadataSchema = z.object({
  cameraMake: z.string().max(120).nullable().optional(),
  cameraModel: z.string().max(160).nullable().optional(),
  lensModel: z.string().max(160).nullable().optional(),
  focalLength: finiteNullableNumber,
  aperture: finiteNullableNumber,
  shutterSeconds: finiteNullableNumber,
  iso: z.number().int().nonnegative().nullable().optional(),
  originalCapturedAt: z.string().datetime().nullable().optional(),
  originalLatitude: z.number().min(-90).max(90).nullable().optional(),
  originalLongitude: z.number().min(-180).max(180).nullable().optional(),
  orientation: z.number().int().min(1).max(8).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  rawExif: z.record(z.string(), z.unknown()).optional(),
});

export const createUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(supportedImageContentTypes),
  size: z.number().int().positive().max(25 * 1024 * 1024),
});

export const completeUploadSchema = z.object({ metadata: photoMetadataSchema });
