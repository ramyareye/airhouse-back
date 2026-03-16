import * as Sentry from "@sentry/cloudflare";
import { Hono } from "hono";

import artistsApi from "../routes/api/artists";
import contentApi from "../routes/api/content";
import schedulesApi from "../routes/api/schedules";
import usersApi from "../routes/api/users";
import venuesApi from "../routes/api/venues";
import { errorHandler, notFound } from "../routes/middlewares/error.middlewares";
import type { Env } from "../types/env";
import { createAuth } from "./auth/create-auth";

const app = new Hono<{ Bindings: Env }>();

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
