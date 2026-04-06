import { describe, expect, it } from "vitest";
import { requestWorker } from "./helpers/app";

describe("worker health", () => {
  it("GET / redirects to the website", async () => {
    const res = await requestWorker("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("GET /health returns ok", async () => {
    const res = await requestWorker("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("redirects unknown routes to the website", async () => {
    const res = await requestWorker("/unknown");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("blocks phone password auth routes when the feature is off", async () => {
    const res = await requestWorker("/api/auth/sign-in/phone-number", {
      method: "POST",
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not Found" });
  });

  it("normalizes verify-email requests to the configured site callback", async () => {
    const res = await requestWorker("/api/auth/verify-email?token=test-token", undefined, {
      AUTH_EMAIL_CALLBACK_URL: "https://the-airhouse.com/",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost/api/auth/verify-email?token=test-token&callbackURL=https%3A%2F%2Fthe-airhouse.com%2F",
    );
  });

  it("redirects legacy root verify-email links to the mounted auth route", async () => {
    const res = await requestWorker("/verify-email?token=test-token");

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost/api/auth/verify-email?token=test-token",
    );
  });

  it("overrides mismatched verify-email callback urls", async () => {
    const res = await requestWorker(
      "/api/auth/verify-email?token=test-token&callbackURL=airhouseapp%3A%2F%2F",
      undefined,
      {
        AUTH_EMAIL_CALLBACK_URL: "https://the-airhouse.com/",
      },
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost/api/auth/verify-email?token=test-token&callbackURL=https%3A%2F%2Fthe-airhouse.com%2F",
    );
  });
});
