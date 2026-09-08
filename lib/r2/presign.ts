import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getRuntimeEnv } from "@/lib/env";

function createR2Client() {
  const runtime = getRuntimeEnv();
  return new S3Client({
    region: "auto",
    endpoint: `https://${runtime.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: runtime.R2_ACCESS_KEY_ID, secretAccessKey: runtime.R2_SECRET_ACCESS_KEY },
  });
}

/** Verifies the S3-compatible R2 credentials without reading or writing an object. */
export async function verifyR2UploadConfiguration() {
  const runtime = getRuntimeEnv();
  await createR2Client().send(new HeadBucketCommand({ Bucket: runtime.R2_BUCKET_NAME }));
}

export async function createSignedUploadUrl(input: { objectKey: string; contentType: string; expiresInSeconds: number }) {
  const runtime = getRuntimeEnv();
  return getSignedUrl(createR2Client(), new PutObjectCommand({
    Bucket: runtime.R2_BUCKET_NAME,
    Key: input.objectKey,
    ContentType: input.contentType,
  }), { expiresIn: input.expiresInSeconds });
}
