import { APIError } from "better-auth";

export const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED" as const;

export const emailNotVerifiedResponse = {
  success: false,
  message: "Email verification required",
  error: "Verified account required",
  code: EMAIL_NOT_VERIFIED_CODE,
  canResend: true,
};

type VerificationAwareUser = {
  email?: string | null;
  emailVerified?: boolean | null;
};

export const requiresVerifiedEmail = (user: VerificationAwareUser) =>
  Boolean(user.email);

export const hasVerifiedEmail = (user: VerificationAwareUser) =>
  !requiresVerifiedEmail(user) || user.emailVerified === true;

export const assertVerifiedEmailActionAllowed = (user: VerificationAwareUser) => {
  if (hasVerifiedEmail(user)) {
    return;
  }

  throw new APIError("FORBIDDEN", emailNotVerifiedResponse);
};
