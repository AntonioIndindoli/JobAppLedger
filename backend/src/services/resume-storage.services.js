import { env } from "../config/env.js";
import { createR2ResumeStorage } from "./r2-resume-storage.services.js";

export const RESUME_STORAGE_METHODS = Object.freeze([
  "presignUpload",
  "presignDownload",
  "inspectObject",
  "readObjectRange",
  "deleteObject",
]);

export function createResumeStorage(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("A resume storage adapter is required.");
  }

  const missing = RESUME_STORAGE_METHODS.filter((method) => typeof adapter[method] !== "function");
  if (missing.length > 0) {
    throw new TypeError(`Resume storage adapter is missing methods: ${missing.join(", ")}.`);
  }

  return Object.freeze(adapter);
}

let resumeStorage;

export function getResumeStorage() {
  if (!env.RESUME_STORAGE_ENABLED) {
    throw new Error("Resume storage is not configured. Set the required R2 environment variables.");
  }

  if (!resumeStorage) {
    resumeStorage = createResumeStorage(
      createR2ResumeStorage({
        endpoint: env.R2_ENDPOINT,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucketName: env.R2_BUCKET_NAME,
        signedUrlTtlSeconds: env.RESUME_SIGNED_URL_TTL_SECONDS,
      }),
    );
  }

  return resumeStorage;
}

export function setResumeStorageForTests(adapter) {
  resumeStorage = adapter ? createResumeStorage(adapter) : undefined;
}
