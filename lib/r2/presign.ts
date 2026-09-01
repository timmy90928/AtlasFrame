import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getRuntimeEnv } from "@/lib/env";

export async function createSignedUploadUrl(input: { objectKey: string; contentType: string; expiresInSeconds: number }) {
  const runtime = getRuntimeEnv();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${runtime.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: runtime.R2_ACCESS_KEY_ID, secretAccessKey: runtime.R2_SECRET_ACCESS_KEY },
  });
  return getSignedUrl(client, new PutObjectCommand({
    Bucket: runtime.R2_BUCKET_NAME,
    Key: input.objectKey,
    ContentType: input.contentType,
  }), { expiresIn: input.expiresInSeconds });
}
