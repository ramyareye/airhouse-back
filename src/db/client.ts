import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as authSchema from "../../auth-schema";
import * as schema from "./schema";
import * as relations from "./relations";

export function getDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, {
    schema: { ...schema, ...relations, ...authSchema },
  });
}
