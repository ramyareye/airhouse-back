import type { Next } from "hono";
import { eq } from "drizzle-orm";
import { user } from "../../../auth-schema";
import { getDb } from "../../db/client";
import type { AuthContext } from "../../types/auth";
import { createAuth } from "../../worker/auth/create-auth";
import {
  emailNotVerifiedResponse,
  hasVerifiedEmail,
  requiresVerifiedEmail,
} from "../../worker/auth/verification";

export { EMAIL_NOT_VERIFIED_CODE, emailNotVerifiedResponse } from "../../worker/auth/verification";

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

export const requireVerifiedUser = async (c: AuthContext, next: Next) => {
  const currentUser = c.get("user");

  if (!requiresVerifiedEmail(currentUser)) {
    await next();
    return;
  }

  if (hasVerifiedEmail(currentUser)) {
    await next();
    return;
  }

  const db = getDb(c.env.DATABASE_URL);
  const [dbUser] = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, currentUser.id))
    .limit(1);

  if (dbUser?.emailVerified === true) {
    await next();
    return;
  }

  return c.json(emailNotVerifiedResponse, 403);
};
