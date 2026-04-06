import { describe, expect, it } from "vitest";

import {
  buildBetterAuthBaseUrl,
  buildAuthFeatureFlags,
  buildWebsiteUrl,
  buildPhonePlaceholderEmail,
  buildTrustedOrigins,
  isPhonePasswordAuthPath,
  isValidPhoneNumber,
  parseBooleanFlag,
  validateAuthFeatureFlags,
} from "../src/lib/auth-config";
import { buildTestEnv } from "./helpers/env";

describe("auth config helpers", () => {
  it("parses boolean flags consistently", () => {
    expect(parseBooleanFlag("1")).toBe(true);
    expect(parseBooleanFlag("true")).toBe(true);
    expect(parseBooleanFlag("yes")).toBe(true);
    expect(parseBooleanFlag("0")).toBe(false);
    expect(parseBooleanFlag(undefined)).toBe(false);
  });

  it("builds trusted origins from auth, cors, and configured origins", () => {
    const origins = buildTrustedOrigins({
      BETTER_AUTH_URL: "https://api.airhouse.name/api/auth",
      AUTH_EMAIL_CALLBACK_URL: "https://the-airhouse.com/",
      AUTH_TRUSTED_ORIGINS:
        "https://airhouse.name,invalid,https://www.airhouse.name,airhouseapp://,exp://127.0.0.1:8081/--/",
      CORS_ORIGIN: "https://app.airhouse.name",
    });

    expect(origins).toEqual([
      "https://api.airhouse.name",
      "https://app.airhouse.name",
      "https://the-airhouse.com",
      "https://airhouse.name",
      "https://www.airhouse.name",
      "airhouseapp://",
      "exp://127.0.0.1:8081",
    ]);
  });

  it("normalizes the auth base url to the mounted /api/auth path", () => {
    expect(
      buildBetterAuthBaseUrl({
        BETTER_AUTH_URL: "https://api.airhouse.name",
      }),
    ).toBe("https://api.airhouse.name/api/auth");

    expect(
      buildBetterAuthBaseUrl({
        BETTER_AUTH_URL: "http://127.0.0.1:8787",
      }),
    ).toBe("http://127.0.0.1:8787/api/auth");

    expect(
      buildBetterAuthBaseUrl({
        BETTER_AUTH_URL: "https://api.airhouse.name/api/auth",
      }),
    ).toBe("https://api.airhouse.name/api/auth");
  });

  it("builds the public website url from the configured callback url", () => {
    expect(
      buildWebsiteUrl({
        AUTH_EMAIL_CALLBACK_URL: "https://the-airhouse.com/welcome?x=1",
      }),
    ).toBe("https://www.the-airhouse.com/");

    expect(
      buildWebsiteUrl({
        AUTH_EMAIL_CALLBACK_URL: "http://localhost:3000/account",
      }),
    ).toBe("http://localhost:3000/");
  });

  it("validates phone numbers as E.164", () => {
    expect(isValidPhoneNumber("+905551112233")).toBe(true);
    expect(isValidPhoneNumber("05551112233")).toBe(false);
  });

  it("builds a stable placeholder email for phone signups", () => {
    expect(buildPhonePlaceholderEmail("+90 555 111 22 33", "phone.airhouse.local")).toBe(
      "plus905551112233@phone.airhouse.local",
    );
  });

  it("requires providers for enabled auth delivery features", () => {
    const env = buildTestEnv({
      EMAIL_VERIFICATION_ENABLED: "1",
    });

    expect(() => validateAuthFeatureFlags(buildAuthFeatureFlags(env))).toThrow(
      "EMAIL_VERIFICATION_ENABLED=1 requires RESEND_API_KEY and EMAIL_FROM.",
    );
  });

  it("requires twilio when phone auth is enabled", () => {
    const env = buildTestEnv({
      PHONE_AUTH_ENABLED: "1",
    });

    expect(() => validateAuthFeatureFlags(buildAuthFeatureFlags(env))).toThrow(
      "PHONE_AUTH_ENABLED=1 requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE_NUMBER.",
    );
  });

  it("requires phone auth when phone password auth is enabled", () => {
    const env = buildTestEnv({
      PHONE_PASSWORD_AUTH_ENABLED: "1",
    });

    expect(() => validateAuthFeatureFlags(buildAuthFeatureFlags(env))).toThrow(
      "PHONE_PASSWORD_AUTH_ENABLED=1 requires PHONE_AUTH_ENABLED=1.",
    );
  });

  it("identifies phone password auth routes", () => {
    expect(isPhonePasswordAuthPath("/api/auth/sign-in/phone-number")).toBe(true);
    expect(isPhonePasswordAuthPath("/api/auth/phone-number/request-password-reset")).toBe(true);
    expect(isPhonePasswordAuthPath("/api/auth/phone-number/reset-password")).toBe(true);
    expect(isPhonePasswordAuthPath("/api/auth/phone-number/send-otp")).toBe(false);
  });
});
