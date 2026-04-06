import { buildWebsiteUrl } from "../lib/auth-config";
import type { Env } from "../types/env";

const LAST_UPDATED = "April 6, 2026";
const CONTACT_URL = "https://www.the-airhouse.com/contact-here";

const buildPageHtml = ({
  title,
  description,
  heading,
  intro,
  meta,
  bodyHtml,
}: {
  title: string;
  description: string;
  heading: string;
  intro: string;
  meta: string;
  bodyHtml: string;
}) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | The Air House</title>
    <meta
      name="description"
      content="${description}"
    />
    <style>
      :root {
        color-scheme: dark;
        --bg: #08131a;
        --panel: rgba(14, 31, 41, 0.86);
        --text: #f4f0e8;
        --muted: #b2c2cb;
        --line: rgba(244, 240, 232, 0.14);
        --accent: #f6b566;
        --accent-2: #78d6b6;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top left, rgba(246, 181, 102, 0.18), transparent 30%),
          radial-gradient(circle at top right, rgba(120, 214, 182, 0.14), transparent 28%),
          linear-gradient(180deg, #0a171f 0%, #08131a 52%, #061018 100%);
        color: var(--text);
      }

      a {
        color: inherit;
      }

      main {
        width: min(880px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0 64px;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 28px;
        backdrop-filter: blur(18px);
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
        overflow: hidden;
      }

      .hero {
        padding: 40px 28px 28px;
        border-bottom: 1px solid var(--line);
      }

      .eyebrow {
        margin: 0 0 12px;
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--accent);
      }

      h1 {
        margin: 0;
        font-size: clamp(40px, 7vw, 68px);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }

      .intro {
        margin: 18px 0 0;
        max-width: 680px;
        font-size: 18px;
        line-height: 1.7;
        color: var(--muted);
      }

      .meta {
        margin-top: 18px;
        color: var(--accent-2);
        font-size: 14px;
      }

      .content {
        padding: 8px 28px 32px;
      }

      section {
        padding: 24px 0;
        border-bottom: 1px solid var(--line);
      }

      section:last-of-type {
        border-bottom: 0;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 22px;
      }

      p,
      li {
        font-size: 16px;
        line-height: 1.75;
        color: var(--muted);
      }

      ul,
      ol {
        margin: 0;
        padding-left: 20px;
      }

      .footer {
        padding-top: 24px;
      }

      .button {
        display: inline-block;
        margin-top: 8px;
        margin-right: 10px;
        padding: 12px 18px;
        border-radius: 999px;
        border: 1px solid rgba(246, 181, 102, 0.35);
        background: rgba(246, 181, 102, 0.12);
        color: var(--text);
        text-decoration: none;
      }

      @media (max-width: 640px) {
        main {
          width: min(100%, calc(100% - 20px));
          padding: 20px 0 28px;
        }

        .hero,
        .content {
          padding-left: 18px;
          padding-right: 18px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <article class="panel">
        <header class="hero">
          <p class="eyebrow">The Air House</p>
          <h1>${heading}</h1>
          <p class="intro">${intro}</p>
          <p class="meta">${meta}</p>
        </header>

        <div class="content">
          ${bodyHtml}
        </div>
      </article>
    </main>
  </body>
</html>`;

const buildPrivacyPolicyHtml = (websiteUrl: string) =>
  buildPageHtml({
    title: "Privacy Policy",
    description: "Privacy Policy for The Air House mobile app and related services.",
    heading: "Privacy Policy",
    intro:
      "This Privacy Policy explains how The Air House collects, uses, and protects personal information when you use our mobile app, website, and related festival content services.",
    meta: `Last updated: ${LAST_UPDATED}`,
    bodyHtml: `
      <section>
        <h2>1. Information We Collect</h2>
        <p>Depending on how you use Airhouse, we may collect:</p>
        <ul>
          <li>Account details such as your name, email address, and phone number.</li>
          <li>Authentication and session data such as login sessions, device or browser details, IP address, and security logs.</li>
          <li>Profile and app activity such as saved schedules, favorites, and preferences you choose to store.</li>
          <li>Support or contact information you send to us directly.</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Information</h2>
        <p>We use personal information to operate and improve Airhouse, including to:</p>
        <ul>
          <li>create and manage accounts;</li>
          <li>authenticate users and keep the service secure;</li>
          <li>sync saved schedules and other user-specific app data;</li>
          <li>respond to support requests and service communications; and</li>
          <li>monitor reliability, debug issues, and prevent abuse.</li>
        </ul>
      </section>

      <section>
        <h2>3. Content and Third-Party Services</h2>
        <p>
          Airhouse may display festival, artist, venue, and schedule information sourced
          from partners, organizers, or publicly available materials. Personal information
          is not sold by Airhouse. We may use third-party providers for infrastructure,
          authentication, email delivery, analytics, logging, and error monitoring, and
          those providers may process data on our behalf only as needed to deliver the service.
        </p>
      </section>

      <section>
        <h2>4. Data Retention</h2>
        <p>
          We keep personal information for as long as reasonably necessary to provide the
          service, maintain account history, comply with legal obligations, resolve disputes,
          and enforce our terms. When information is no longer needed, we will delete it or
          de-identify it where practical.
        </p>
      </section>

      <section>
        <h2>5. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect personal
          information. No system is completely secure, so we cannot guarantee absolute
          security, but we work to limit unauthorized access, disclosure, or misuse.
        </p>
      </section>

      <section>
        <h2>6. Your Choices</h2>
        <p>
          You may request access, correction, or deletion of your account information,
          subject to applicable law and operational requirements. If you would like help
          with a privacy request, contact us using the details below.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          For privacy questions or requests, contact The Air House at
          <a href="${CONTACT_URL}">${CONTACT_URL}</a>.
        </p>
        <p class="footer">
          <a class="button" href="${websiteUrl}">Return to The Air House</a>
        </p>
      </section>
    `,
  });

const buildDeleteAccountHtml = (websiteUrl: string) =>
  buildPageHtml({
    title: "Delete Account",
    description: "How to delete your Airhouse account and what happens to your data.",
    heading: "Delete Account",
    intro:
      "Airhouse account deletion is available inside the app. This page explains how to delete your account and what data is removed when the request is completed.",
    meta: `Last updated: ${LAST_UPDATED}`,
    bodyHtml: `
      <section>
        <h2>1. Delete Your Account In The App</h2>
        <p>To permanently delete your Airhouse account:</p>
        <ol>
          <li>Open the Airhouse app.</li>
          <li>Go to Settings.</li>
          <li>Choose Delete Account.</li>
          <li>Confirm the deletion request.</li>
        </ol>
      </section>

      <section>
        <h2>2. What Happens When You Delete</h2>
        <p>When an account deletion request is completed, Airhouse will:</p>
        <ul>
          <li>remove active login sessions;</li>
          <li>remove linked account records used for sign-in;</li>
          <li>remove saved schedules tied to the account; and</li>
          <li>anonymize the remaining user profile record so it is no longer associated with your identity.</li>
        </ul>
      </section>

      <section>
        <h2>3. Retention</h2>
        <p>
          We may retain limited technical or legal records when required for security,
          fraud prevention, dispute handling, or compliance with applicable law.
        </p>
      </section>

      <section>
        <h2>4. Need Help?</h2>
        <p>
          If you cannot access the app and need help with account deletion, contact us at
          <a href="${CONTACT_URL}">${CONTACT_URL}</a>.
        </p>
        <p class="footer">
          <a class="button" href="${websiteUrl}">Return to The Air House</a>
          <a class="button" href="${websiteUrl}privacy-policy">Privacy Policy</a>
        </p>
      </section>
    `,
  });

export const renderPrivacyPolicy = (env: Pick<Env, "AUTH_EMAIL_CALLBACK_URL">) =>
  new Response(buildPrivacyPolicyHtml(buildWebsiteUrl(env)), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });

export const renderDeleteAccount = (env: Pick<Env, "AUTH_EMAIL_CALLBACK_URL">) =>
  new Response(buildDeleteAccountHtml(buildWebsiteUrl(env)), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });
