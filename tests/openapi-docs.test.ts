import { describe, expect, it } from "vitest";
import { requestWorker } from "./helpers/app";

describe("openapi docs", () => {
  it("serves the OpenAPI document outside production", async () => {
    const res = await requestWorker("/openapi.json");

    expect(res.status).toBe(200);

    const body = await res.json<{
      paths: Record<string, unknown>;
    }>();

    expect(body.paths).toMatchObject({
      "/api/artists": expect.any(Object),
      "/api/venues": expect.any(Object),
      "/api/schedules": expect.any(Object),
      "/api/content/all": expect.any(Object),
      "/api/cache/purge": expect.any(Object),
    });
  });

  it("serves Swagger UI outside production", async () => {
    const res = await requestWorker("/docs");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("hides docs in production by default", async () => {
    const res = await requestWorker("/openapi.json", undefined, {
      CF_VERSION_METADATA: { id: "prod-version" },
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });
});
