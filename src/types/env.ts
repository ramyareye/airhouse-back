export type Env = {
  CF_VERSION_METADATA?: { id: string };
  DATABASE_URL: string;
  CACHE_VERSION?: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  AUTH_TRUSTED_ORIGINS?: string;
  CORS_ORIGIN?: string;
  SENTRY_DSN?: string;
};
