import { neon } from "@neondatabase/serverless";
import * as Sentry from "@sentry/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { drizzle } from "drizzle-orm/neon-http";
import { Hono } from "hono";

import * as authSchema from "../../auth-schema";
import artistsApi from "../routes/api/artists";
import schedulesApi from "../routes/api/schedules";
import usersApi from "../routes/api/users";
import venuesApi from "../routes/api/venues";
import { errorHandler, notFound } from "../routes/middlewares/error.middlewares";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>();

let cachedAuth: ReturnType<typeof betterAuth> | null = null;
let cachedAuthKey: string | null = null;

const parseOrigin = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
};

const buildTrustedOrigins = (env: Env): string[] => {
  const origins = new Set<string>();
  const authOrigin = parseOrigin(env.BETTER_AUTH_URL);
  if (authOrigin) origins.add(authOrigin);

  for (const raw of (env.AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    const parsed = parseOrigin(raw);
    if (parsed) origins.add(parsed);
  }

  return Array.from(origins);
};

const buildAuthCacheKey = (env: Env) =>
  [
    env.DATABASE_URL,
    env.BETTER_AUTH_URL,
    env.BETTER_AUTH_SECRET,
    env.AUTH_TRUSTED_ORIGINS ?? "",
  ].join("|");

export function createAuth(env: Env) {
  const cacheKey = buildAuthCacheKey(env);
  if (cachedAuth && cachedAuthKey === cacheKey) {
    return cachedAuth;
  }

  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql, { schema: authSchema });

  cachedAuth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    user: {
      modelName: "user",
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    plugins: [bearer()],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
      storage: "database",
    },
    trustedOrigins: buildTrustedOrigins(env),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  });

  cachedAuthKey = cacheKey;
  return cachedAuth;
}

app.get("/", (c) => c.json({ service: "airhouse-festival-backend", status: "ok" }));
app.get("/health", (c) => c.json({ ok: true }));

app.all("/api/auth/*", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route("/api/users", usersApi);
app.route("/api/artists", artistsApi);
app.route("/api/venues", venuesApi);
app.route("/api/schedules", schedulesApi);

app.onError(errorHandler);
app.notFound(notFound);

export { app as workerApp };

export default Sentry.withSentry((env: Env) => {
  const isProd = Boolean(env.CF_VERSION_METADATA?.id);
  return {
    enabled: isProd,
    dsn: env.SENTRY_DSN,
    release: env.CF_VERSION_METADATA?.id,
    sendDefaultPii: isProd,
  };
}, app);
