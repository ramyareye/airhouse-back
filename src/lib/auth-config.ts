import type { Env } from "../types/env";

const PHONE_NUMBER_PATTERN = /^\+[1-9]\d{7,14}$/;

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
  env: Pick<Env, "AUTH_TRUSTED_ORIGINS" | "BETTER_AUTH_URL" | "CORS_ORIGIN">,
) => {
  const origins = new Set<string>();

  const authOrigin = parseOrigin(env.BETTER_AUTH_URL);
  if (authOrigin) origins.add(authOrigin);

  const corsOrigin = parseOrigin(env.CORS_ORIGIN);
  if (corsOrigin) origins.add(corsOrigin);

  for (const raw of (env.AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    const parsed = parseOrigin(raw);
    if (parsed) origins.add(parsed);
  }

  return Array.from(origins);
};

export type AuthFeatureFlags = {
  enableEmailVerification: boolean;
  requireEmailVerification: boolean;
  enablePhoneAuth: boolean;
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
  const requirePhoneVerification =
    env.PHONE_AUTH_REQUIRE_VERIFICATION == null
      ? enablePhoneAuth
      : parseBooleanFlag(env.PHONE_AUTH_REQUIRE_VERIFICATION);

  return {
    enableEmailVerification,
    requireEmailVerification,
    enablePhoneAuth,
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
};

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
    env.CORS_ORIGIN ?? "",
    env.EMAIL_VERIFICATION_ENABLED ?? "",
    env.REQUIRE_EMAIL_VERIFICATION ?? "",
    env.RESEND_API_KEY ?? "",
    env.EMAIL_FROM ?? "",
    env.PHONE_AUTH_ENABLED ?? "",
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
