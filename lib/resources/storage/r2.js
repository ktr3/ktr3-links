import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function required(value, name) {
  if (!value) throw new Error(`${name} is required when RESOURCE_STORAGE_DRIVER=r2`);
  return value;
}

export function createR2Storage({
  accountId = process.env.R2_ACCOUNT_ID,
  accessKeyId = process.env.R2_ACCESS_KEY_ID,
  secretAccessKey = process.env.R2_SECRET_ACCESS_KEY,
  bucket = process.env.R2_BUCKET,
  endpoint = process.env.R2_ENDPOINT,
} = {}) {
  const resolvedAccount = endpoint ? null : required(accountId, "R2_ACCOUNT_ID");
  const resolvedEndpoint = endpoint || `https://${resolvedAccount}.r2.cloudflarestorage.com`;
  const resolvedBucket = required(bucket, "R2_BUCKET");
  const client = new S3Client({
    region: "auto",
    endpoint: resolvedEndpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: required(accessKeyId, "R2_ACCESS_KEY_ID"),
      secretAccessKey: required(secretAccessKey, "R2_SECRET_ACCESS_KEY"),
    },
  });

  return {
    driver: "r2",

    async put(key, bytes, contentType = "application/octet-stream") {
      await client.send(new PutObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }));
      return { key };
    },

    async get(key) {
      const object = await client.send(new GetObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
      }));
      return {
        body: object.Body,
        contentType: object.ContentType || "application/octet-stream",
        contentLength: Number(object.ContentLength) || undefined,
      };
    },

    async delete(key) {
      await client.send(new DeleteObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
      }));
    },

    async signedDownloadUrl(key, downloadName, expiresInSeconds = 600) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: resolvedBucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${downloadName}"`,
        }),
        { expiresIn: expiresInSeconds },
      );
    },
  };
}
