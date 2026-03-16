import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";

import * as authSchema from "../../../auth-schema";
import {
  buildAuthCacheKey,
  buildAuthFeatureFlags,
  buildTrustedOrigins,
  validateAuthFeatureFlags,
} from "../../lib/auth-config";
import type { Env } from "../../types/env";
import {
  buildAuthPlugins,
  buildEmailAndPasswordOptions,
  buildEmailVerificationOptions,
  buildSocialProviders,
} from "./options";

const initAuth = (env: Env) => {
  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql, { schema: authSchema });
  const flags = buildAuthFeatureFlags(env);

  validateAuthFeatureFlags(flags);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    user: {
      modelName: "user",
    },
    emailAndPassword: buildEmailAndPasswordOptions(env, flags),
    emailVerification: buildEmailVerificationOptions(env, flags),
    socialProviders: buildSocialProviders(env, flags),
    plugins: buildAuthPlugins(env, flags),
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
      storage: "database",
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
    },
    trustedOrigins: buildTrustedOrigins(env),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  });
};

export type AuthInstance = ReturnType<typeof initAuth>;

let cachedAuth: AuthInstance | null = null;
let cachedAuthKey: string | null = null;

export function createAuth(env: Env): AuthInstance {
  const cacheKey = buildAuthCacheKey(env);

  if (cachedAuth && cachedAuthKey === cacheKey) {
    return cachedAuth;
  }

  cachedAuth = initAuth(env);
  cachedAuthKey = cacheKey;

  return cachedAuth;
}
