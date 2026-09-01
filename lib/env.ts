import { env as cloudflareEnv } from "cloudflare:workers";
import { z } from "zod";

const databaseRuntimeSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const runtimeSchema = databaseRuntimeSchema.extend({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  APP_ORIGIN: z.url(),
  AUTH_API_ORIGIN: z.url(),
  AUTH_CLIENT_ID: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/),
});

const publicRuntimeSchema = databaseRuntimeSchema.pick({ SUPABASE_URL: true, SUPABASE_PUBLISHABLE_KEY: true });

const authRuntimeSchema = z.object({
  APP_ORIGIN: z.url(),
  AUTH_API_ORIGIN: z.url(),
  AUTH_CLIENT_ID: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/),
});

export type RuntimeEnv = z.infer<typeof runtimeSchema>;
export type DatabaseRuntimeEnv = z.infer<typeof databaseRuntimeSchema>;

export function getRuntimeEnv(): RuntimeEnv {
  return runtimeSchema.parse(cloudflareEnv);
}

export function getDatabaseRuntimeEnv(): DatabaseRuntimeEnv {
  return databaseRuntimeSchema.parse(cloudflareEnv);
}

/** Values deliberately safe to provide to the browser. */
export function getPublicRuntimeEnv() {
  return publicRuntimeSchema.parse(cloudflareEnv);
}

export function getAuthRuntimeEnv() {
  return authRuntimeSchema.parse(cloudflareEnv);
}

export function getBindings(): Pick<CloudflareEnv, "PHOTOS_BUCKET" | "IMAGES"> {
  return cloudflareEnv as unknown as Pick<CloudflareEnv, "PHOTOS_BUCKET" | "IMAGES">;
}
