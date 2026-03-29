import { Hono } from "hono";
import type { Env } from "../../types/env";
import { setCacheVersionOverride } from "../middlewares/cache.middlewares";
import { requireIpAllowlist } from "../middlewares/security.middlewares";

const cacheApi = new Hono<{ Bindings: Env }>();

cacheApi.use("/*", requireIpAllowlist("OPS_ALLOWED_IPS", "Operations"));

cacheApi.post("/purge", async (c) => {
  const token = c.env.CACHE_PURGE_TOKEN?.trim();
  if (!token) {
    return c.json({ error: "Cache purge is not configured" }, 501);
  }

  const headerToken = c.req.header("x-cache-purge-token")?.trim();
  if (!headerToken || headerToken !== token) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const version = Date.now().toString();
  setCacheVersionOverride(version);

  return c.json({
    purged: true,
    cacheVersion: version,
    note: "This only affects the current isolate. For a global purge, set CACHE_VERSION and redeploy.",
  });
});

export default cacheApi;
