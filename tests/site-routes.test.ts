import { describe, expect, it } from "vitest";
import { requestWorker } from "./helpers/app";

describe("site routes", () => {
  it("serves the delete-account page as html", async () => {
    const res = await requestWorker("/delete-account");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("Delete Account");
  });

  it("serves the privacy policy as html", async () => {
    const res = await requestWorker("/privacy-policy");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await res.text()).toContain("Privacy Policy");
  });

  it("redirects the root path to the canonical website in production", async () => {
    const res = await requestWorker("/", undefined, {
      AUTH_EMAIL_CALLBACK_URL: "https://the-airhouse.com/",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.the-airhouse.com/");
  });

  it("redirects unknown routes to the canonical website in production", async () => {
    const res = await requestWorker("/unknown", undefined, {
      AUTH_EMAIL_CALLBACK_URL: "https://the-airhouse.com/",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.the-airhouse.com/");
  });
});
