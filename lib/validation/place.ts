import { z } from "zod";

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createPlaceSchema = coordinatesSchema.extend({
  name: z.string().trim().min(2).max(160),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
});

export const setLocationSchema = z.object({
  placeId: z.string().uuid(),
  replaceExisting: z.boolean().default(false),
});
