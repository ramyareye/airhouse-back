import type { Next } from "hono";
import type { AuthContext } from "../../types/auth";
import { createAuth } from "../../worker/index";

export const buildAuthHeaders = (c: AuthContext) => {
  const headers = new Headers(c.req.raw.headers);
  const authz = c.req.header("authorization");
  if (authz) {
    headers.set("authorization", authz);
    headers.delete("cookie");
  }
  return headers;
};

export const getSession = async (c: AuthContext) => {
  const auth = createAuth(c.env);
  return auth.api.getSession({ headers: buildAuthHeaders(c) });
};

export const protect = async (c: AuthContext, next: Next) => {
  const session = await getSession(c);

  if (!session?.user) {
    return c.json(
      {
        success: false,
        message: "Unauthorized",
        error: "No valid session found",
      },
      401,
    );
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
};
