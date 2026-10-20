import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalParaDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== "production") globalParaDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
