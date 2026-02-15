import { describe, expect, it } from "vitest";
import { requestWorker } from "./helpers/app";

describe("worker health", () => {
  it("GET / returns service metadata", async () => {
    const res = await requestWorker("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      service: "airhouse-festival-backend",
      status: "ok",
    });
  });

  it("GET /health returns ok", async () => {
    const res = await requestWorker("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 404 for unknown route", async () => {
    const res = await requestWorker("/unknown");
    expect(res.status).toBe(404);
  });
});
