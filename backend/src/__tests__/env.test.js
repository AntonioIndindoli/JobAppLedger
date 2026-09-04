import assert from "node:assert/strict";
import test from "node:test";

import { loadEnv } from "../config/env.js";

const BASE_ENV = {
  DATABASE_URL: "postgresql://example.invalid/jobhazel",
  JWT_ACCESS_SECRET: "access-secret",
  JWT_REFRESH_SECRET: "refresh-secret",
};

test("production startup reports every missing R2 setting", () => {
  assert.throws(
    () => loadEnv({ ...BASE_ENV, NODE_ENV: "production" }),
    (error) => {
      assert.match(error.message, /Missing required resume storage env vars/);
      for (const name of [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "R2_ENDPOINT",
      ]) {
        assert.match(error.message, new RegExp(name));
      }
      return true;
    },
  );
});

test("partial R2 configuration fails in development", () => {
  assert.throws(
    () => loadEnv({ ...BASE_ENV, R2_BUCKET_NAME: "jobhazel-resumes" }),
    /Missing required resume storage env vars/,
  );
});

test("resume limits are parsed and validated", () => {
  const config = loadEnv({
    ...BASE_ENV,
    RESUME_UPLOAD_MAX_BYTES: "1024",
    RESUME_ACTIVE_LIMIT: "3",
    RESUME_SIGNED_URL_TTL_SECONDS: "60",
  });
  assert.equal(config.RESUME_UPLOAD_MAX_BYTES, 1024);
  assert.equal(config.RESUME_ACTIVE_LIMIT, 3);
  assert.equal(config.RESUME_SIGNED_URL_TTL_SECONDS, 60);
  assert.throws(
    () => loadEnv({ ...BASE_ENV, RESUME_SIGNED_URL_TTL_SECONDS: "604801" }),
    /RESUME_SIGNED_URL_TTL_SECONDS/,
  );
});
