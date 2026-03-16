export const buildEmailHtml = (
  title: string,
  intro: string,
  actionLabel: string,
  actionUrl: string,
) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
    <h1 style="font-size: 24px; margin: 0 0 16px;">${title}</h1>
    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${intro}</p>
    <p style="margin: 0 0 24px;">
      <a href="${actionUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px;">${actionLabel}</a>
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0;">If the button does not work, use this link:</p>
    <p style="font-size: 14px; line-height: 1.6; word-break: break-all; color: #4b5563; margin: 8px 0 0;">${actionUrl}</p>
  </div>
`;

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
