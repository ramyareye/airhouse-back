import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { buildWebsiteUrl } from "../../lib/auth-config";

export const errorHandler: ErrorHandler = (err, c) => {
  const status = (
    "status" in err && typeof err.status === "number" ? err.status : 500
  ) as ContentfulStatusCode;
  const isProd = Boolean(c.env?.CF_VERSION_METADATA?.id);

  return c.json(
    {
      success: false,
      message: err.message || "Internal Server Error",
      ...(isProd ? {} : { stack: err.stack }),
    },
    status,
  );
};

export const notFound: NotFoundHandler = (c) => c.redirect(buildWebsiteUrl(c.env), 302);
