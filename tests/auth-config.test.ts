import { describe, expect, it } from "vitest";

import {
  buildAuthFeatureFlags,
  buildPhonePlaceholderEmail,
  buildTrustedOrigins,
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
      AUTH_TRUSTED_ORIGINS: "https://airhouse.name,invalid,https://www.airhouse.name",
      CORS_ORIGIN: "https://app.airhouse.name",
    });

    expect(origins).toEqual([
      "https://api.airhouse.name",
      "https://app.airhouse.name",
      "https://airhouse.name",
      "https://www.airhouse.name",
    ]);
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
});
