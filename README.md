# AtlasFrame

AtlasFrame is a geospatial photography platform built around one idea: one person, one place, one frame.

## Local setup

1. Copy `.env.example` to `.env.local` and provide Supabase/R2 values.
2. Apply `db/migrations/0000_atlasframe_foundation.sql` in Supabase SQL Editor.
3. Configure R2 CORS from `docs/r2-cors.json`, keeping the bucket private.
4. Run `pnpm install`, then `pnpm dev`.

The Cloudflare account must expose the `PHOTOS_BUCKET` R2 binding and `IMAGES` binding. Secrets are set with `wrangler secret put`; never commit them.
