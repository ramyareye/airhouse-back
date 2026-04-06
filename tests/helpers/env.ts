import type { Env } from "../../src/types/env";

export function buildTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    DATABASE_URL: "postgresql://user:password@localhost:5432/airhousefestival?sslmode=require",
    BETTER_AUTH_URL: "http://localhost:8787",
    BETTER_AUTH_SECRET: "test-secret",
    AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
    AUTH_EMAIL_CALLBACK_URL: "http://localhost:3000/",
    ...overrides,
  };
}
