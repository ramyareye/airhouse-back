import type { Context } from "hono";
import type { Env } from "./env";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string | null;
  emailVerified?: boolean;
  image?: string | null;
  partner_id?: string | null;
};

export type AuthSession = {
  id: string;
  userId: string;
  expiresAt?: string | Date;
};

export type AuthVariables = {
  user: AuthUser;
  session: AuthSession;
};

export type AuthBindings = {
  Bindings: Env;
  Variables: AuthVariables;
};

export type AuthContext = Context<AuthBindings>;
