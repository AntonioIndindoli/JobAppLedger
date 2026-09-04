import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MAX_RESUME_INSPECTION_RANGE_BYTES = 64 * 1024;

function assertObjectKey(key) {
  if (typeof key !== "string" || key.length === 0 || key.startsWith("/")) {
    throw new TypeError("Resume storage key must be a non-empty relative object key.");
  }
}

function normalizeExpiry(expiresInSeconds, fallback) {
  const value = expiresInSeconds ?? fallback;
  if (!Number.isInteger(value) || value < 1 || value > 604800) {
    throw new RangeError("Presigned URL expiry must be between 1 and 604800 seconds.");
  }
  return value;
}

function buildContentDisposition(filename) {
  if (!filename) return undefined;
  const normalized = String(filename).replace(/[\r\n]/g, " ").trim() || "resume.pdf";
  const ascii = normalized.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(normalized)}`;
}

function isNotFound(error) {
  return error?.name === "NotFound" || error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404;
}

export function createR2ResumeStorage({
  endpoint,
  accessKeyId,
  secretAccessKey,
  bucketName,
  signedUrlTtlSeconds = 300,
  client,
  presign = getSignedUrl,
}) {
  if (!bucketName) throw new Error("Resume storage bucket name is required.");

  const s3 =
    client ??
    new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

  return {
    async presignUpload({ key, contentType, expiresInSeconds } = {}) {
      assertObjectKey(key);
      if (!contentType) throw new TypeError("Upload content type is required.");
      const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: contentType });
      return presign(s3, command, {
        expiresIn: normalizeExpiry(expiresInSeconds, signedUrlTtlSeconds),
      });
    },

    async presignDownload({ key, downloadFilename, expiresInSeconds } = {}) {
      assertObjectKey(key);
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        ResponseContentDisposition: buildContentDisposition(downloadFilename),
      });
      return presign(s3, command, {
        expiresIn: normalizeExpiry(expiresInSeconds, signedUrlTtlSeconds),
      });
    },

    async inspectObject(key) {
      assertObjectKey(key);
      try {
        const result = await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
        return {
          sizeBytes: result.ContentLength ?? null,
          contentType: result.ContentType ?? null,
          etag: result.ETag ?? null,
          checksumSha256: result.ChecksumSHA256 ?? null,
          lastModified: result.LastModified ?? null,
        };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async readObjectRange(key, { start = 0, end = 4 } = {}) {
      assertObjectKey(key);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
        throw new RangeError("Resume object byte range is invalid.");
      }
      if (end - start + 1 > MAX_RESUME_INSPECTION_RANGE_BYTES) {
        throw new RangeError(`Resume object byte range cannot exceed ${MAX_RESUME_INSPECTION_RANGE_BYTES} bytes.`);
      }

      const result = await s3.send(
        new GetObjectCommand({ Bucket: bucketName, Key: key, Range: `bytes=${start}-${end}` }),
      );
      if (!result.Body || typeof result.Body.transformToByteArray !== "function") {
        throw new Error("Resume storage returned an unreadable object body.");
      }
      return Buffer.from(await result.Body.transformToByteArray());
    },

    async deleteObject(key) {
      assertObjectKey(key);
      await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    },
  };
}
