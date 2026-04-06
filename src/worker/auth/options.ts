import { bearer } from "better-auth/plugins/bearer";
import { phoneNumber } from "better-auth/plugins/phone-number";

import {
  buildAuthEmailCallbackUrl,
  buildBetterAuthBaseUrl,
  buildPhonePlaceholderEmail,
  isValidPhoneNumber,
  type AuthFeatureFlags,
} from "../../lib/auth-config";
import type { Env } from "../../types/env";
import { maskEmail, maskPhoneNumber } from "./masks";
import { buildEmailHtml, sendResendEmail, sendTwilioSms } from "./messaging";

const logEvent = (payload: Record<string, unknown>) => {
  console.log(JSON.stringify(payload));
};

const buildTrimmedSecrets = (env: Env) => ({
  emailFrom: env.EMAIL_FROM?.trim(),
  resendApiKey: env.RESEND_API_KEY?.trim(),
  twilioAccountSid: env.TWILIO_ACCOUNT_SID?.trim(),
  twilioAuthToken: env.TWILIO_AUTH_TOKEN?.trim(),
  twilioFromPhoneNumber: env.TWILIO_FROM_PHONE_NUMBER?.trim(),
});

export const buildSocialProviders = (env: Env, flags: AuthFeatureFlags) => {
  if (!flags.hasGoogleOAuth && !flags.hasAppleOAuth) {
    return undefined;
  }

  return {
    ...(flags.hasGoogleOAuth
      ? {
          google: {
            enabled: true,
            clientId: env.GOOGLE_OAUTH_CLIENT_ID!,
            clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
          },
        }
      : {}),
    ...(flags.hasAppleOAuth
      ? {
          apple: {
            enabled: true,
            clientId: env.APPLE_OAUTH_CLIENT_ID!,
            clientSecret: env.APPLE_OAUTH_CLIENT_SECRET!,
            ...(env.APPLE_OAUTH_APP_BUNDLE_IDENTIFIER
              ? { appBundleIdentifier: env.APPLE_OAUTH_APP_BUNDLE_IDENTIFIER }
              : {}),
          },
        }
      : {}),
  };
};

export const buildAuthPlugins = (env: Env, flags: AuthFeatureFlags) => {
  const { twilioAccountSid, twilioAuthToken, twilioFromPhoneNumber } = buildTrimmedSecrets(env);

  return [
    bearer(),
    ...(flags.enablePhoneAuth
      ? [
          phoneNumber({
            requireVerification: flags.requirePhoneVerification,
            expiresIn: 300,
            otpLength: 6,
            allowedAttempts: 3,
            signUpOnVerification: {
              getTempEmail: (phone) =>
                buildPhonePlaceholderEmail(phone, env.PHONE_AUTH_TEMP_EMAIL_DOMAIN),
              getTempName: (phone) => phone,
            },
            phoneNumberValidator: async (phone) => isValidPhoneNumber(phone),
            sendOTP: async ({ phoneNumber: phone, code }) => {
              logEvent({
                type: "phone_otp_send_attempt",
                phoneNumber: maskPhoneNumber(phone),
              });

              const result = await sendTwilioSms(
                twilioAccountSid!,
                twilioAuthToken!,
                twilioFromPhoneNumber!,
                phone,
                `Your Airhouse verification code is ${code}. It expires in 5 minutes.`,
              );

              logEvent({
                type: "phone_otp_send_success",
                phoneNumber: maskPhoneNumber(phone),
                provider: "twilio",
                messageSid: result.sid,
              });
            },
            sendPasswordResetOTP: async ({ phoneNumber: phone, code }) => {
              logEvent({
                type: "phone_reset_otp_send_attempt",
                phoneNumber: maskPhoneNumber(phone),
              });

              const result = await sendTwilioSms(
                twilioAccountSid!,
                twilioAuthToken!,
                twilioFromPhoneNumber!,
                phone,
                `Your Airhouse password reset code is ${code}. It expires in 5 minutes.`,
              );

              logEvent({
                type: "phone_reset_otp_send_success",
                phoneNumber: maskPhoneNumber(phone),
                provider: "twilio",
                messageSid: result.sid,
              });
            },
          }),
        ]
      : []),
  ];
};

export const buildEmailAndPasswordOptions = (env: Env, flags: AuthFeatureFlags) => {
  const { emailFrom, resendApiKey } = buildTrimmedSecrets(env);

  return {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: flags.requireEmailVerification,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({
      user,
      url,
    }: {
      url: string;
      user: { email: string; id: string };
    }) => {
      logEvent({
        type: "password_reset_send_attempt",
        userId: user.id,
        email: maskEmail(user.email),
      });

      const response = await sendResendEmail(resendApiKey!, {
        from: emailFrom!,
        to: user.email,
        subject: "Reset your password for The Air House",
        html: buildEmailHtml(
          "Reset your password",
          "We received a request to reset your password for The Air House.",
          "Reset password",
          url,
        ),
        text: [
          "We received a request to reset your password for The Air House.",
          "",
          `Reset password: ${url}`,
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
      });

      logEvent({
        type: "password_reset_send_success",
        userId: user.id,
        email: maskEmail(user.email),
        provider: "resend",
        messageId: response.id,
      });
    },
  };
};

export const buildEmailVerificationOptions = (env: Env, flags: AuthFeatureFlags) => {
  if (!flags.enableEmailVerification) {
    return undefined;
  }

  const { emailFrom, resendApiKey } = buildTrimmedSecrets(env);
  const callbackUrl = encodeURIComponent(buildAuthEmailCallbackUrl(env));
  const betterAuthBaseUrl = buildBetterAuthBaseUrl(env);

  return {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({
      user,
      token,
    }: {
      token: string;
      user: { email: string; id: string };
    }) => {
      const verificationUrl = `${betterAuthBaseUrl}/verify-email?token=${encodeURIComponent(token)}&callbackURL=${callbackUrl}`;

      logEvent({
        type: "email_verification_send_attempt",
        userId: user.id,
        email: maskEmail(user.email),
      });

      const response = await sendResendEmail(resendApiKey!, {
        from: emailFrom!,
        to: user.email,
        subject: "Verify your email for The Air House",
        html: buildEmailHtml(
          "Verify your email",
          "Confirm your email address to finish setting up your account for The Air House.",
          "Verify email",
          verificationUrl,
        ),
        text: [
          "Confirm your email address to finish setting up your account for The Air House.",
          "",
          `Verify email: ${verificationUrl}`,
        ].join("\n"),
      });

      logEvent({
        type: "email_verification_send_success",
        userId: user.id,
        email: maskEmail(user.email),
        provider: "resend",
        messageId: response.id,
      });
    },
  };
};
