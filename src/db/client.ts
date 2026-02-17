import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as authSchema from "../../auth-schema";
import * as relations from "./relations";
import * as schema from "./schema";

export function getDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, {
    schema: { ...schema, ...relations, ...authSchema },
  });
}
