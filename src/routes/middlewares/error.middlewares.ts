import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const errorHandler: ErrorHandler = (err, c) => {
  const status = (
    "status" in err && typeof err.status === "number" ? err.status : 500
  ) as ContentfulStatusCode;

  return c.json(
    {
      success: false,
      message: err.message || "Internal Server Error",
    },
    status,
  );
};

export const notFound: NotFoundHandler = (c) =>
  c.json(
    {
      success: false,
      message: `Not Found - [${c.req.method}]:[${c.req.url}]`,
    },
    404,
  );
