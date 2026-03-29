import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "../../types/env";

type BindingsOnly = { Bindings: Env };
type IpAllowlistEnvKey = "OPS_ALLOWED_IPS";

export const getClientIp = <E extends BindingsOnly>(c: Context<E>): string | null => {
  const cfIp = c.req.header("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return null;
};

const parseAllowlist = (value?: string | null) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

export const requireIpAllowlist =
  (envKey: IpAllowlistEnvKey, label: string): MiddlewareHandler<{ Bindings: Env }> =>
  async (c, next) => {
    const allowedIps = parseAllowlist(c.env[envKey]);
    if (!allowedIps.size) {
      await next();
      return;
    }

    const clientIp = getClientIp(c);
    if (!clientIp || !allowedIps.has(clientIp)) {
      return c.json(
        {
          error: `${label} access is not allowed from this IP`,
        },
        403,
      );
    }

    await next();
  };
