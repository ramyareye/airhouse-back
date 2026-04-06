const EMAIL_BRAND_NAME = "The Air House";
const EMAIL_LOGO_URL = "https://files.airhouse.name/files/icon.png";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const buildEmailHtml = (
  title: string,
  intro: string,
  actionLabel: string,
  actionUrl: string,
) => {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f5f5f4; color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f4; margin:0; padding:0; width:100%;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; background-color:#ffffff; border:1px solid #e7e5e4; border-radius:20px;">
            <tr>
              <td align="center" style="padding:32px 32px 12px;">
                <img src="${EMAIL_LOGO_URL}" alt="${EMAIL_BRAND_NAME}" width="56" height="56" style="display:block; width:56px; height:56px; margin:0 auto 12px; border:0;" />
                <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:13px; line-height:20px; letter-spacing:0.12em; text-transform:uppercase; color:#78716c; font-weight:700;">
                  ${EMAIL_BRAND_NAME}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <h1 style="margin:0 0 16px; font-size:34px; line-height:1.15; color:#111827; font-weight:700;">
                  ${safeTitle}
                </h1>
                <p style="margin:0 0 28px; font-size:17px; line-height:1.7; color:#374151;">
                  ${safeIntro}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                  <tr>
                    <td align="center" bgcolor="#111827" style="border-radius:12px;">
                      <a href="${safeActionUrl}" style="display:inline-block; padding:14px 22px; font-size:16px; line-height:20px; font-weight:600; color:#ffffff; text-decoration:none;">
                        ${safeActionLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:#57534e;">
                  If the button does not work, use this alternate link:
                </p>
                <p style="margin:0 0 24px; font-size:14px; line-height:1.6;">
                  <a href="${safeActionUrl}" style="color:#111827; text-decoration:underline; font-weight:600;">
                    Click here to continue
                  </a>
                </p>
                <p style="margin:0; font-size:13px; line-height:1.7; color:#78716c;">
                  If you did not request this email, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const sendResendEmail = async (
  apiKey: string,
  payload: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  },
) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}`);
  }

  return (await response.json()) as { id?: string };
};

export const sendTwilioSms = async (
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
) => {
  const params = new URLSearchParams({
    From: from,
    To: to,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    throw new Error(`Twilio returned ${response.status}`);
  }

  return (await response.json()) as { sid?: string };
};
