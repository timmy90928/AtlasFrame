import { z } from "zod";

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
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(25 * 1024 * 1024),
});

export const completeUploadSchema = z.object({ metadata: photoMetadataSchema });
