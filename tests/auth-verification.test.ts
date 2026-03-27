import { APIError } from "better-auth";
import { describe, expect, it } from "vitest";

import {
  assertVerifiedEmailActionAllowed,
  emailNotVerifiedResponse,
  hasVerifiedEmail,
  requiresVerifiedEmail,
} from "../src/worker/auth/verification";

describe("auth verification policy", () => {
  it("requires verification for email accounts", () => {
    expect(
      requiresVerifiedEmail({
        email: "team@airhouse.name",
        emailVerified: false,
      }),
    ).toBe(true);
  });

  it("treats phone-only accounts as not requiring email verification", () => {
    expect(
      requiresVerifiedEmail({
        email: null,
        emailVerified: false,
      }),
    ).toBe(false);
    expect(
      hasVerifiedEmail({
        email: null,
        emailVerified: false,
      }),
    ).toBe(true);
  });

  it("throws the shared forbidden error for unverified email actions", () => {
    expect(() =>
      assertVerifiedEmailActionAllowed({
        email: "team@airhouse.name",
        emailVerified: false,
      }),
    ).toThrowError(APIError);

    try {
      assertVerifiedEmailActionAllowed({
        email: "team@airhouse.name",
        emailVerified: false,
      });
    } catch (error) {
      const apiError = error as APIError & {
        body?: typeof emailNotVerifiedResponse;
        status?: string;
      };

      expect(apiError.status).toBe("FORBIDDEN");
      expect(apiError.body).toEqual(emailNotVerifiedResponse);
    }
  });

  it("allows verified email actions", () => {
    expect(() =>
      assertVerifiedEmailActionAllowed({
        email: "verified@airhouse.name",
        emailVerified: true,
      }),
    ).not.toThrow();
  });
});
