import { describe, expect, it } from "vitest";
import cacheApi from "../src/routes/api/cache";
import { buildTestEnv } from "./helpers/env";

describe("cache api", () => {
  it("rejects requests from disallowed IPs", async () => {
    const res = await cacheApi.request(
      "http://localhost/purge",
      {
        method: "POST",
        headers: {
          "cf-connecting-ip": "203.0.113.10",
          "x-cache-purge-token": "secret",
        },
      },
      buildTestEnv({
        CACHE_PURGE_TOKEN: "secret",
        OPS_ALLOWED_IPS: "198.51.100.7",
      }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Operations access is not allowed from this IP",
    });
  });

  it("purges cache version for allowed requests with the correct token", async () => {
    const res = await cacheApi.request(
      "http://localhost/purge",
      {
        method: "POST",
        headers: {
          "cf-connecting-ip": "203.0.113.10",
          "x-cache-purge-token": "secret",
        },
      },
      buildTestEnv({
        CACHE_PURGE_TOKEN: "secret",
        OPS_ALLOWED_IPS: "203.0.113.10",
      }),
    );

    expect(res.status).toBe(200);

    const body = await res.json<{
      purged: boolean;
      cacheVersion: string;
      note: string;
    }>();

    expect(body.purged).toBe(true);
    expect(body.cacheVersion).toMatch(/^\d+$/);
    expect(body.note).toContain("current isolate");
  });
});
