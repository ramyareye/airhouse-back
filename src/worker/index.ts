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
import type { Env } from "../types/env";
import { createAuth } from "./auth/create-auth";
import { openApiConfig, shouldExposePublicDocs } from "./docs";
import { registerManualOpenApi } from "./openapi";

const app = new OpenAPIHono<{ Bindings: Env }>();

app.get("/", (c) => c.json({ service: "airhouse-festival-backend", status: "ok" }));
app.get("/health", (c) => c.json({ ok: true }));

app.all("/api/auth/*", async (c) => {
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
