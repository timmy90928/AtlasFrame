import { randomUUID } from "crypto";
import { requireProfile } from "@/lib/auth/request";
import { createSignedUploadUrl } from "@/lib/r2/presign";
import { fromSupabaseError, handleApiError, ok } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/server";
import { createUploadSchema } from "@/lib/validation/photo";

const uploadLifetimeSeconds = 20 * 60;

export async function POST(request: Request) {
  try {
    const user = await requireProfile(request);
    const input = createUploadSchema.parse(await request.json());
    const photoId = randomUUID();
    const assetId = randomUUID();
    const extension = input.contentType.split("/")[1];
    const objectKey = `photos/${user.profileId}/${photoId}/original.${extension}`;
    const admin = createAdminClient();
    const { data: expiresAt, error } = await admin.rpc("reserve_photo_upload", {
      p_user_id: user.profileId,
      p_photo_id: photoId,
      p_asset_id: assetId,
      p_object_key: objectKey,
      p_mime_type: input.contentType,
      p_file_size: input.size,
    });
    if (error) fromSupabaseError(error);
    const uploadUrl = await createSignedUploadUrl({ objectKey, contentType: input.contentType, expiresInSeconds: uploadLifetimeSeconds });
    return ok({ photoId, uploadUrl, expiresAt, requiredHeaders: { "content-type": input.contentType } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
