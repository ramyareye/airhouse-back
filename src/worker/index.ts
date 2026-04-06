import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import * as Sentry from "@sentry/cloudflare";
import type { MiddlewareHandler } from "hono";

import artistsApi from "../routes/api/artists";
import cacheApi from "../routes/api/cache";
import contentApi from "../routes/api/content";
import schedulesApi from "../routes/api/schedules";
import usersApi from "../routes/api/users";
import venuesApi from "../routes/api/venues";
import { errorHandler, notFound } from "../routes/middlewares/error.middlewares";
import {
  buildAuthFeatureFlags,
  buildWebsiteUrl,
  buildAuthEmailCallbackUrl,
  isPhonePasswordAuthPath,
} from "../lib/auth-config";
import type { Env } from "../types/env";
import { createAuth } from "./auth/create-auth";
import { openApiConfig, shouldExposePublicDocs } from "./docs";
import { registerManualOpenApi } from "./openapi";
import { renderDeleteAccount, renderPrivacyPolicy } from "./site";

const app = new OpenAPIHono<{ Bindings: Env }>();

app.get("/", (c) => c.redirect(buildWebsiteUrl(c.env), 302));
app.get("/health", (c) => c.json({ ok: true }));
app.get("/delete-account", (c) => renderDeleteAccount(c.env));
app.get("/delete-account/", (c) => renderDeleteAccount(c.env));
app.get("/privacy-policy", (c) => renderPrivacyPolicy(c.env));
app.get("/privacy-policy/", (c) => renderPrivacyPolicy(c.env));
app.get("/verify-email", (c) => {
  const requestUrl = new URL(c.req.url);
  requestUrl.pathname = "/api/auth/verify-email";
  return c.redirect(requestUrl.toString(), 302);
});

app.all("/api/auth/*", async (c) => {
  const requestUrl = new URL(c.req.url);

  if (requestUrl.pathname === "/api/auth/verify-email") {
    const callbackUrl = buildAuthEmailCallbackUrl(c.env);

    if (requestUrl.searchParams.get("callbackURL") !== callbackUrl) {
      requestUrl.searchParams.set("callbackURL", callbackUrl);
      return c.redirect(requestUrl.toString(), 302);
    }
  }

  const flags = buildAuthFeatureFlags(c.env);
  if (!flags.enablePhonePasswordAuth && isPhonePasswordAuthPath(requestUrl.pathname)) {
    return c.json({ error: "Not Found" }, 404);
  }

  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route("/api/users", usersApi);
app.route("/api/artists", artistsApi);
app.route("/api/venues", venuesApi);
app.route("/api/schedules", schedulesApi);
app.route("/api/content", contentApi);
app.route("/api/cache", cacheApi);
registerManualOpenApi(app);

const docsHandler = swaggerUI({
  url: "/openapi.json",
}) as MiddlewareHandler<{ Bindings: Env }>;

app.get("/openapi.json", (c) => {
  if (!shouldExposePublicDocs(c.env)) {
    return notFound(c);
  }

  return c.json(app.getOpenAPIDocument(openApiConfig));
});

app.get("/docs", async (c, next) => {
  if (!shouldExposePublicDocs(c.env)) {
    return notFound(c);
  }

  return docsHandler(c, next);
});

app.onError(errorHandler);
app.notFound(notFound);

export { app as workerApp };
export { createAuth };

export default Sentry.withSentry((env: Env) => {
  const isProd = Boolean(env.CF_VERSION_METADATA?.id);
  return {
    enabled: isProd,
    dsn: env.SENTRY_DSN,
    release: env.CF_VERSION_METADATA?.id,
    sendDefaultPii: isProd,
  };
}, app);
