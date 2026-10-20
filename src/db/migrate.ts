// Aplica las migraciones de drizzle/ al arrancar (también en el contenedor).
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await migrate(drizzle(pool), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
await pool.end();
console.log("Migraciones aplicadas");
