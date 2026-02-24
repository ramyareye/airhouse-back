import type { MiddlewareHandler } from "hono";
import { resolveLocale } from "../../lib/i18n";
import type { Env } from "../../types/env";

type CacheOptions = {
  browserTtlSeconds?: number;
  edgeTtlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
};

const DEFAULT_BROWSER_TTL = 300;
const DEFAULT_EDGE_TTL = 3600;
const DEFAULT_SWR_TTL = 86400;
const AUTH_COOKIE_PATTERNS = [
  /^better-auth\./i,
  /^__secure-better-auth\./i,
  /^__host-better-auth\./i,
];

let cacheVersionOverride: string | null = null;

export const setCacheVersionOverride = (value: string | null) => {
  cacheVersionOverride = value;
};

const getCacheVersion = (env: Env) => cacheVersionOverride ?? env.CACHE_VERSION ?? "1";

const updateVary = (headers: Headers, value: string) => {
  const current = headers.get("vary");
  if (!current) {
    headers.set("Vary", value);
    return;
  }

  const values = new Set(
    current
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  values.add(value);
  headers.set("Vary", Array.from(values).join(", "));
};

const extractCookieNames = (cookieHeader: string): string[] =>
  cookieHeader
    .split(";")
    .map((part) => part.trim().split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));

const hasAuthCookie = (cookieHeader: string | null) => {
  if (!cookieHeader) return false;

  const cookieNames = extractCookieNames(cookieHeader);
  return cookieNames.some((name) => AUTH_COOKIE_PATTERNS.some((pattern) => pattern.test(name)));
};

const shouldBypassForRequest = (request: Request) => {
  const authz = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  return Boolean(authz || hasAuthCookie(cookie));
};

const isCacheableResponse = (response: Response) => {
  if (response.status !== 200) return false;
  if (response.headers.has("set-cookie")) return false;

  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
    return false;
  }

  return true;
};

export const cachePublic =
  (options: CacheOptions = {}): MiddlewareHandler<{ Bindings: Env }> =>
  async (c, next) => {
    if (c.req.method !== "GET") {
      await next();
      return;
    }

    if (typeof caches === "undefined") {
      await next();
      c.res.headers.set("X-Worker-Cache", "UNAVAILABLE");
      return;
    }

    if (shouldBypassForRequest(c.req.raw)) {
      await next();
      c.res.headers.set("X-Worker-Cache", "BYPASS");
      return;
    }

    const cache = (caches as CacheStorage & { default: Cache }).default;
    const cacheKeyUrl = new URL(c.req.url);
    cacheKeyUrl.searchParams.set("__cv", getCacheVersion(c.env));
    cacheKeyUrl.searchParams.set("__lang", resolveLocale(c));
    const cacheKey = new Request(cacheKeyUrl.toString(), { method: "GET" });

    let cached: Response | undefined;
    try {
      cached = await cache.match(cacheKey);
    } catch (err) {
      console.warn("Cache match failed:", err);
    }

    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Worker-Cache", "HIT");
      updateVary(headers, "Accept-Language");
      updateVary(headers, "X-Lang");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }

    await next();

    const res = c.res;
    if (!isCacheableResponse(res)) {
      res.headers.set("X-Worker-Cache", "BYPASS");
      return;
    }

    const browserTtl = options.browserTtlSeconds ?? DEFAULT_BROWSER_TTL;
    const edgeTtl = options.edgeTtlSeconds ?? DEFAULT_EDGE_TTL;
    const swrTtl = options.staleWhileRevalidateSeconds ?? DEFAULT_SWR_TTL;

    res.headers.set("X-Worker-Cache", "MISS");
    updateVary(res.headers, "Accept-Language");
    updateVary(res.headers, "X-Lang");
    if (!res.headers.has("cache-control")) {
      res.headers.set(
        "Cache-Control",
        `public, max-age=${browserTtl}, s-maxage=${edgeTtl}, stale-while-revalidate=${swrTtl}`,
      );
    }

    const store = async () => {
      try {
        await cache.put(cacheKey, res.clone());
      } catch (err) {
        console.warn("Cache put failed:", err);
      }
    };

    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(store());
      return;
    }

    await store();
  };
