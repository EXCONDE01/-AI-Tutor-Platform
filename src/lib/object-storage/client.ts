/**
 * Neon Object Storage client wrapper.
 *
 * Provides an S3-compatible client configured for Neon Object Storage,
 * plus helpers for uploading, deleting, and generating presigned URLs.
 *
 * Required env vars:
 *   NEON_STORAGE_ACCESS_KEY   - S3 access key id
 *   NEON_STORAGE_SECRET_KEY   - S3 secret access key
 *   NEON_STORAGE_ENDPOINT     - Bucket endpoint, e.g. https://bucket.neonstorage.app
 *   NEON_STORAGE_REGION       - Region, e.g. us-east-1
 *   NEON_STORAGE_BUCKET       - Bucket name (default: ai-tutor-uploads)
 */

import {
  S3Client,
  type PutObjectCommandInput,
  type DeleteObjectCommandInput,
} from '@aws-sdk/client-s3';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.NEON_STORAGE_BUCKET ?? 'ai-tutor-uploads';

function getClient(): S3Client {
  const accessKeyId = process.env.NEON_STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.NEON_STORAGE_SECRET_KEY;
  const endpoint = process.env.NEON_STORAGE_ENDPOINT;
  const region = process.env.NEON_STORAGE_REGION ?? 'us-east-1';

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      'Neon Object Storage is not configured. Set NEON_STORAGE_ACCESS_KEY, NEON_STORAGE_SECRET_KEY and NEON_STORAGE_ENDPOINT.'
    );
  }

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

/** Returns a configured S3 client for Neon Object Storage. */
export function getObjectStorageClient(): S3Client {
  return getClient();
}

/**
 * Uploads a file to Neon Object Storage.
 * Returns the public object URL.
 */
export async function uploadFile(
  key: string,
  file: File | Buffer,
  contentType: string
): Promise<string> {
  const client = getClient();

  let body: Uint8Array;
  if (Buffer.isBuffer(file)) {
    body = new Uint8Array(file);
  } else {
    const ab = await file.arrayBuffer();
    body = new Uint8Array(ab);
  }

  const input: PutObjectCommandInput = {
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  await client.send(new PutObjectCommand(input));

  const endpoint = process.env.NEON_STORAGE_ENDPOINT!;
  return `${endpoint}/${BUCKET}/${key}`;
}

/** Deletes a file from Neon Object Storage. */
export async function deleteFile(key: string): Promise<void> {
  const client = getClient();

  const input: DeleteObjectCommandInput = {
    Bucket: BUCKET,
    Key: key,
  };

  await client.send(new DeleteObjectCommand(input));
}

/**
 * Generates a presigned PUT URL for direct browser upload.
 * @param key - Object key (path) in the bucket.
 * @param contentType - MIME type of the file being uploaded.
 * @param expiresIn - URL expiry in seconds (default 900 = 15 min).
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<string> {
  const client = getClient();

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export { BUCKET };
