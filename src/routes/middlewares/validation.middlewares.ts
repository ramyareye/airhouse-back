import type { MiddlewareHandler } from "hono";
import { ZodError, type ZodTypeAny } from "zod";

type ValidateJsonBodyOptions = {
  invalidJsonError?: string;
  validationError?: string;
};

export function validateJsonBody(
  schema: ZodTypeAny,
  options: ValidateJsonBodyOptions = {},
): MiddlewareHandler {
  const invalidJsonError = options.invalidJsonError ?? "Invalid JSON";
  const validationError = options.validationError ?? "Invalid request body";

  return async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: invalidJsonError }, 400);
    }

    try {
      const parsed = schema.parse(body);
      c.set("validatedBody", parsed);
      await next();
    } catch (err) {
      if (err instanceof ZodError) {
        return c.json(
          {
            error: validationError,
            details: err.flatten(),
          },
          400,
        );
      }

      throw err;
    }
  };
}
