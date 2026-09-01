import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const photoVisibility = pgEnum("photo_visibility", ["PUBLIC", "UNLISTED", "PRIVATE"]);
export const photoStatus = pgEnum("photo_processing_status", ["PENDING", "READY", "FAILED"]);
export const locationSource = pgEnum("location_source", ["EXIF", "MANUAL", "TRIP", "INFERRED"]);
export const locationPrecision = pgEnum("location_precision", ["EXACT", "CITY_ONLY", "HIDDEN", "APPROXIMATE"]);
export const reservationStatus = pgEnum("reservation_status", ["PENDING", "COMMITTED", "EXPIRED", "CANCELLED"]);

export const allowlist = pgTable("alpha_allowlist", {
  email: varchar({ length: 320 }).primaryKey(),
  isActive: boolean("is_active").notNull().default(true),
  note: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid().primaryKey(),
  authSubject: varchar("auth_subject", { length: 255 }).unique(),
  authEmail: varchar("auth_email", { length: 320 }),
  username: varchar({ length: 32 }).notNull().unique(),
  displayName: varchar("display_name", { length: 80 }),
  avatarKey: varchar("avatar_key", { length: 512 }),
  bio: text(),
  website: varchar({ length: 2048 }),
  countryCode: varchar("country_code", { length: 2 }),
  storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" }).notNull().default(524_288_000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const photos = pgTable("photos", {
  id: uuid().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id),
  title: varchar({ length: 160 }),
  description: text(),
  visibility: photoVisibility().notNull().default("PUBLIC"),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
  processingStatus: photoStatus("processing_status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const photoAssets = pgTable("photo_assets", {
  id: uuid().primaryKey(),
  photoId: uuid("photo_id").notNull().unique().references(() => photos.id),
  objectKey: varchar("object_key", { length: 1024 }).notNull().unique(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  width: integer(),
  height: integer(),
  checksum: varchar({ length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const photoMetadata = pgTable("photo_metadata", {
  photoId: uuid("photo_id").primaryKey().references(() => photos.id),
  cameraMake: varchar("camera_make", { length: 120 }),
  cameraModel: varchar("camera_model", { length: 160 }),
  lensModel: varchar("lens_model", { length: 160 }),
  focalLength: doublePrecision("focal_length"),
  aperture: doublePrecision(),
  shutterSeconds: doublePrecision("shutter_seconds"),
  iso: integer(),
  originalCapturedAt: timestamp("original_captured_at", { withTimezone: true }),
  originalLatitude: doublePrecision("original_latitude"),
  originalLongitude: doublePrecision("original_longitude"),
  orientation: integer(),
  width: integer(),
  height: integer(),
  metadataSource: varchar("metadata_source", { length: 40 }).notNull().default("CLIENT_EXIF"),
  metadataVerified: boolean("metadata_verified").notNull().default(false),
  rawExif: jsonb("raw_exif"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const places = pgTable("places", {
  id: uuid().primaryKey(),
  parentId: uuid("parent_id"),
  type: varchar({ length: 32 }).notNull().default("CUSTOM"),
  name: varchar({ length: 160 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 160 }).notNull(),
  slug: varchar({ length: 200 }).notNull().unique(),
  latitude: doublePrecision().notNull(),
  longitude: doublePrecision().notNull(),
  countryCode: varchar("country_code", { length: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("places_normalized_name_idx").on(table.normalizedName)]);

export const photoLocations = pgTable("photo_locations", {
  photoId: uuid("photo_id").primaryKey().references(() => photos.id),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id),
  placeId: uuid("place_id").references(() => places.id),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  displayName: varchar("display_name", { length: 160 }),
  source: locationSource().notNull().default("MANUAL"),
  precision: locationPrecision().notNull().default("EXACT"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storageReservations = pgTable("storage_reservations", {
  id: uuid().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id),
  photoId: uuid("photo_id").notNull().unique().references(() => photos.id),
  reservedBytes: bigint("reserved_bytes", { mode: "number" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: reservationStatus().notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tripPhotos = pgTable("trip_photos", {
  tripId: uuid("trip_id").notNull(),
  photoId: uuid("photo_id").notNull().references(() => photos.id),
}, (table) => [primaryKey({ columns: [table.tripId, table.photoId] })]);
