export type Env = {
  CF_VERSION_METADATA?: { id: string };
  DATABASE_URL: string;
  CACHE_VERSION?: string;
  CONTENT_EXPORT_BUCKET?: R2Bucket;
  CONTENT_EXPORT_PREFIX?: string;
  CONTENT_EXPORT_TOKEN?: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  AUTH_TRUSTED_ORIGINS?: string;
  CORS_ORIGIN?: string;
  SENTRY_DSN?: string;
};
