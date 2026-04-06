import { describe, expect, it } from "vitest";

import { buildEmailHtml } from "../src/worker/auth/messaging";

describe("auth email template", () => {
  it("includes The Air House branding and a compact fallback link", () => {
    const html = buildEmailHtml(
      "Verify your email",
      "Confirm your email address to finish setting up your account for The Air House.",
      "Verify email",
      "https://api.airhouse.name/api/auth/verify-email?token=abc&callbackURL=airhouseapp%3A%2F%2F",
    );

    expect(html).toContain("The Air House");
    expect(html).toContain("https://files.airhouse.name/files/icon.png");
    expect(html).toContain("Click here to continue");
    expect(html).not.toContain(
      ">https://api.airhouse.name/api/auth/verify-email?token=abc&callbackURL=airhouseapp%3A%2F%2F<",
    );
  });

  it("escapes user-facing content in the HTML body", () => {
    const html = buildEmailHtml(
      "<Verify>",
      "Use <this> & that",
      'Click "now"',
      "https://api.airhouse.name/api/auth/verify-email?token=abc&callbackURL=airhouseapp%3A%2F%2F",
    );

    expect(html).toContain("&lt;Verify&gt;");
    expect(html).toContain("Use &lt;this&gt; &amp; that");
    expect(html).toContain("Click &quot;now&quot;");
  });
});
