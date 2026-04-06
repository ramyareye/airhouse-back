import type { Env } from "../types/env";

const PHONE_NUMBER_PATTERN = /^\+[1-9]\d{7,14}$/;
const DEFAULT_AUTH_EMAIL_CALLBACK_URL = "https://www.the-airhouse.com/";
const DEFAULT_PUBLIC_WEBSITE_URL = "https://www.the-airhouse.com/";
const DEFAULT_BETTER_AUTH_BASE_PATH = "/api/auth";

const parseOrigin = (value?: string | null): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol === "http:" || protocol === "https:") {
      return parsed.origin;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
};

export const parseBooleanFlag = (value?: string | null) => {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const buildTrustedOrigins = (
  env: Pick<
    Env,
    "AUTH_TRUSTED_ORIGINS" | "AUTH_EMAIL_CALLBACK_URL" | "BETTER_AUTH_URL" | "CORS_ORIGIN"
  >,
) => {
  const origins = new Set<string>();

  const authOrigin = parseOrigin(env.BETTER_AUTH_URL);
  if (authOrigin) origins.add(authOrigin);

  const corsOrigin = parseOrigin(env.CORS_ORIGIN);
  if (corsOrigin) origins.add(corsOrigin);

  const emailCallbackOrigin = parseOrigin(
    env.AUTH_EMAIL_CALLBACK_URL ?? DEFAULT_AUTH_EMAIL_CALLBACK_URL,
  );
  if (emailCallbackOrigin) origins.add(emailCallbackOrigin);

  for (const raw of (env.AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    const parsed = parseOrigin(raw);
    if (parsed) origins.add(parsed);
  }

  return Array.from(origins);
};

export const buildBetterAuthBaseUrl = (env: Pick<Env, "BETTER_AUTH_URL">) => {
  const raw = env.BETTER_AUTH_URL.trim();

  try {
    const url = new URL(raw);
    const normalizedPath = url.pathname.replace(/\/+$/, "");

    if (!normalizedPath || normalizedPath === "/") {
      url.pathname = DEFAULT_BETTER_AUTH_BASE_PATH;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
};

export const buildAuthEmailCallbackUrl = (env: Pick<Env, "AUTH_EMAIL_CALLBACK_URL">) => {
  const configured = env.AUTH_EMAIL_CALLBACK_URL?.trim();

  if (!configured) {
    return DEFAULT_AUTH_EMAIL_CALLBACK_URL;
  }

  try {
    return new URL(configured).toString();
  } catch {
    return DEFAULT_AUTH_EMAIL_CALLBACK_URL;
  }
};

export const buildWebsiteUrl = (env: Pick<Env, "AUTH_EMAIL_CALLBACK_URL">) => {
  try {
    const websiteUrl = new URL(buildAuthEmailCallbackUrl(env));

    if (websiteUrl.hostname === "the-airhouse.com") {
      websiteUrl.hostname = "www.the-airhouse.com";
    }

    websiteUrl.pathname = "/";
    websiteUrl.search = "";
    websiteUrl.hash = "";

    return websiteUrl.toString();
  } catch {
    return DEFAULT_PUBLIC_WEBSITE_URL;
  }
};

export type AuthFeatureFlags = {
  enableEmailVerification: boolean;
  requireEmailVerification: boolean;
  enablePhoneAuth: boolean;
  enablePhonePasswordAuth: boolean;
  requirePhoneVerification: boolean;
  hasGoogleOAuth: boolean;
  hasAppleOAuth: boolean;
  hasResendEmail: boolean;
  hasTwilioSms: boolean;
};

export const buildAuthFeatureFlags = (env: Env): AuthFeatureFlags => {
  const enableEmailVerification = parseBooleanFlag(env.EMAIL_VERIFICATION_ENABLED);
  const requireEmailVerification = parseBooleanFlag(env.REQUIRE_EMAIL_VERIFICATION);
  const enablePhoneAuth = parseBooleanFlag(env.PHONE_AUTH_ENABLED);
  const enablePhonePasswordAuth = parseBooleanFlag(env.PHONE_PASSWORD_AUTH_ENABLED);
  const requirePhoneVerification =
    env.PHONE_AUTH_REQUIRE_VERIFICATION == null
      ? enablePhoneAuth
      : parseBooleanFlag(env.PHONE_AUTH_REQUIRE_VERIFICATION);

  return {
    enableEmailVerification,
    requireEmailVerification,
    enablePhoneAuth,
    enablePhonePasswordAuth,
    requirePhoneVerification,
    hasGoogleOAuth: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET),
    hasAppleOAuth: Boolean(env.APPLE_OAUTH_CLIENT_ID && env.APPLE_OAUTH_CLIENT_SECRET),
    hasResendEmail: Boolean(env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim()),
    hasTwilioSms: Boolean(
      env.TWILIO_ACCOUNT_SID?.trim() &&
      env.TWILIO_AUTH_TOKEN?.trim() &&
      env.TWILIO_FROM_PHONE_NUMBER?.trim(),
    ),
  };
};

export const validateAuthFeatureFlags = (flags: AuthFeatureFlags) => {
  if (flags.requireEmailVerification && !flags.enableEmailVerification) {
    throw new Error(
      "Invalid Better Auth config: REQUIRE_EMAIL_VERIFICATION=1 requires EMAIL_VERIFICATION_ENABLED=1.",
    );
  }

  if (flags.enableEmailVerification && !flags.hasResendEmail) {
    throw new Error(
      "Invalid Better Auth config: EMAIL_VERIFICATION_ENABLED=1 requires RESEND_API_KEY and EMAIL_FROM.",
    );
  }

  if (flags.enablePhoneAuth && !flags.hasTwilioSms) {
    throw new Error(
      "Invalid Better Auth config: PHONE_AUTH_ENABLED=1 requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE_NUMBER.",
    );
  }

  if (flags.enablePhonePasswordAuth && !flags.enablePhoneAuth) {
    throw new Error(
      "Invalid Better Auth config: PHONE_PASSWORD_AUTH_ENABLED=1 requires PHONE_AUTH_ENABLED=1.",
    );
  }
};

const PHONE_PASSWORD_AUTH_PATHS = new Set([
  "/api/auth/sign-in/phone-number",
  "/api/auth/phone-number/request-password-reset",
  "/api/auth/phone-number/reset-password",
]);

export const isPhonePasswordAuthPath = (pathname: string) =>
  PHONE_PASSWORD_AUTH_PATHS.has(pathname);

export const buildPhonePlaceholderEmail = (
  phoneNumber: string,
  domain = "phone.airhouse.local",
) => {
  const normalized = phoneNumber.replace(/[^\d+]/g, "");
  const safeLocalPart = normalized.replace(/\+/g, "plus").toLowerCase();

  return `${safeLocalPart}@${domain}`;
};

export const isValidPhoneNumber = (phoneNumber: string) =>
  PHONE_NUMBER_PATTERN.test(phoneNumber.trim());

export const buildAuthCacheKey = (env: Env) =>
  [
    env.DATABASE_URL,
    env.BETTER_AUTH_URL,
    env.BETTER_AUTH_SECRET,
    env.AUTH_TRUSTED_ORIGINS ?? "",
    env.AUTH_EMAIL_CALLBACK_URL ?? "",
    env.CORS_ORIGIN ?? "",
    env.EMAIL_VERIFICATION_ENABLED ?? "",
    env.REQUIRE_EMAIL_VERIFICATION ?? "",
    env.RESEND_API_KEY ?? "",
    env.EMAIL_FROM ?? "",
    env.PHONE_AUTH_ENABLED ?? "",
    env.PHONE_PASSWORD_AUTH_ENABLED ?? "",
    env.PHONE_AUTH_REQUIRE_VERIFICATION ?? "",
    env.PHONE_AUTH_TEMP_EMAIL_DOMAIN ?? "",
    env.TWILIO_ACCOUNT_SID ?? "",
    env.TWILIO_AUTH_TOKEN ?? "",
    env.TWILIO_FROM_PHONE_NUMBER ?? "",
    env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    env.APPLE_OAUTH_CLIENT_ID ?? "",
    env.APPLE_OAUTH_CLIENT_SECRET ?? "",
    env.APPLE_OAUTH_APP_BUNDLE_IDENTIFIER ?? "",
  ].join("|");
